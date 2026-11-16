import db from '../db/database.js';
import { frameSentence, publicCanonical } from './canonicalTelemetry.js';
import { normalizePayload } from './adapters/registry.js';
import { withImmediateTransaction } from './transaction.js';
import { telemetryRepository } from '../db/repositories/telemetryRepository.js';
import { broadcastWS } from '../services/liveBroadcast.js';
import GeofenceService from '../services/geofenceService.js';
import { classifyDriverBehavior } from './driverBehavior.js';
import { nextOverspeedState } from './overspeedSession.js';
import { deliverSmsJobs, queueOutboundAlerts } from './alertDispatch.js';
import { formatFix, lookupPlaceName } from '../services/placeName.js';

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
    const driverIntelligenceEvents = [];
    const fleetAlerts = [];
    const smsJobs = [];
    const placeTargets = { vehicleId: null, speedAlertId: null, towingAlertId: null, panicId: null };
    const gpsTime = canonical.timing.gpsTime
      ? canonical.timing.gpsTime.replace('T', ' ').replace('Z', '')
      : null;

    if (device.vehicle_id) {
      const address = formatFix(position.latitude, position.longitude);
      placeTargets.vehicleId = device.vehicle_id;
      if (!canonical.alert && canonical.behavior && typeof canonical.behavior === 'object') {
        try {
          const imu = db.get('SELECT * FROM device_imu_configs WHERE device_id = ?', [device.id]);
          canonical.alert = classifyDriverBehavior({
            ...canonical.behavior,
            speedKmh: position.speedKmh
          }, imu || {});
        } catch (err) {
          console.error(`[ingest] ${imei} driver behavior skipped: ${err.message}`);
          canonical.alert = null;
        }
      }

      function recordDriverEvent(alert, eventAddress) {
        if (!alert?.eventType) return null;
        const eventId = telemetryRepository.insertDriverEvent({
          tenantId: device.tenant_id,
          vehicleId: device.vehicle_id,
          deviceId: device.id,
          eventType: String(alert.eventType),
          packetType: alert.packetType ? String(alert.packetType) : 'UNK',
          alertId: Number.isFinite(Number(alert.alertId)) ? Number(alert.alertId) : 0,
          severity: alert.severity ? String(alert.severity) : 'WARNING',
          metricValue: alert.metricValue ? String(alert.metricValue) : String(alert.eventType),
          thresholdValue: alert.thresholdValue ? String(alert.thresholdValue) : '',
          speed: Number.isFinite(Number(position.speedKmh)) ? Number(position.speedKmh) : 0,
          heading: Number.isFinite(Number(position.headingDegrees)) ? Number(position.headingDegrees) : 0,
          latitude: position.latitude,
          longitude: position.longitude,
          address: eventAddress,
          driverName: device.owner_name || 'Fleet Operator',
          gpsTime
        });
        return {
          id: eventId,
          vehicleId: device.vehicle_id,
          registrationNumber: device.registration_number,
          driverName: device.owner_name || 'Fleet Operator',
          eventType: alert.eventType,
          packetType: alert.packetType,
          alertId: alert.alertId,
          severity: alert.severity,
          metricValue: alert.metricValue,
          thresholdValue: alert.thresholdValue,
          speed: position.speedKmh,
          heading: position.headingDegrees,
          latitude: position.latitude,
          longitude: position.longitude,
          timestamp: new Date().toISOString()
        };
      }
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

      const geofenceEvents = GeofenceService.evaluateVehicleGeofences(
        device.vehicle_id,
        position.latitude,
        position.longitude,
        position.speedKmh
      );
      const alertPhones = {
        owner: device.owner_phone,
        alternate: device.alternate_phone,
        emergency: device.emergency_contact_phone
      };
      const notify = (kind, body) => {
        const rows = queueOutboundAlerts(telemetryRepository, {
          tenantId: device.tenant_id,
          vehicleId: device.vehicle_id,
          kind,
          body,
          phones: alertPhones
        });
        smsJobs.push(...rows.filter((row) => row.channel === 'sms'));
      };

      for (const geofenceEvent of geofenceEvents) {
        fleetAlerts.push({
          alertType: 'geofence',
          id: `${device.vehicle_id}-${geofenceEvent.geofenceName}-${geofenceEvent.type}`,
          registrationNumber: device.registration_number,
          title: `Geofence ${geofenceEvent.type}: ${geofenceEvent.geofenceName}`,
          address,
          speed: position.speedKmh,
          eventTime: gpsTime || new Date().toISOString()
        });
        if (geofenceEvent.type === 'entry' || geofenceEvent.type === 'exit') {
          notify('geofence', `${device.registration_number} geofence ${geofenceEvent.type}: ${geofenceEvent.geofenceName} at ${position.speedKmh} km/h. ${address}`);
        }
      }

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
          message: `Panic in ${device.registration_number} at ${position.speedKmh} km/h. Notify owner ${device.owner_phone || 'not set'}, alternate ${device.alternate_phone || 'not set'}, emergency ${device.emergency_contact_phone || 'not set'}.`,
          type: 'panic'
        });
        notify('panic', `Emergency: ${device.registration_number} panic at ${position.latitude}, ${position.longitude}, ${position.speedKmh} km/h, ${gpsTime || ''}.`);
        placeTargets.panicId = panicId;
        fleetAlerts.push({
          alertType: 'panic',
          id: panicId,
          registrationNumber: device.registration_number,
          title: `Emergency SOS: ${device.registration_number}`,
          address,
          speed: position.speedKmh,
          eventTime: gpsTime || new Date().toISOString()
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

      const stamp = gpsTime || new Date().toISOString();
      const openSpeed = telemetryRepository.findOpenSpeedAlert(device.vehicle_id);
      const arming = telemetryRepository.findSpeedArming(device.vehicle_id);
      const decision = nextOverspeedState({
        speed: position.speedKmh,
        limit: device.speed_limit,
        gpsTime: stamp,
        latitude: position.latitude,
        longitude: position.longitude,
        open: openSpeed,
        arming
      });
      if (decision.action === 'clear-arm' && arming) {
        telemetryRepository.clearSpeedArming(device.vehicle_id);
      } else if (decision.action === 'arm') {
        telemetryRepository.saveSpeedArming({
          vehicleId: device.vehicle_id,
          startedAt: decision.startedAt,
          latitude: position.latitude,
          longitude: position.longitude
        });
      } else if (decision.action === 'open') {
        telemetryRepository.clearSpeedArming(device.vehicle_id);
        const speedEvent = recordDriverEvent({
          eventType: 'OVERSPEEDING',
          packetType: 'OS',
          alertId: 17,
          severity: decision.severity,
          metricValue: `${position.speedKmh} km/h`,
          thresholdValue: `${device.speed_limit} km/h`
        }, address);
        if (speedEvent) driverIntelligenceEvents.push(speedEvent);
        const speedId = telemetryRepository.insertSpeedAlert({
          tenantId: device.tenant_id,
          vehicleId: device.vehicle_id,
          speed: position.speedKmh,
          speedLimit: device.speed_limit,
          latitude: position.latitude,
          longitude: position.longitude,
          address,
          gpsTime: decision.startedAt,
          endedAt: stamp,
          severity: decision.severity,
          distanceKm: decision.distanceKm,
          driverEventId: speedEvent?.id || null
        });
        placeTargets.speedAlertId = speedId;
        telemetryRepository.insertNotification({
          tenantId: device.tenant_id,
          vehicleId: device.vehicle_id,
          title: `Speed Alert: ${device.registration_number}`,
          message: `${device.registration_number} reached ${position.speedKmh} km/h. Limit is ${device.speed_limit} km/h. Severity ${decision.severity}.`,
          type: 'overspeed'
        });
        notify('overspeed', `${device.registration_number} at ${position.speedKmh} km/h, limit ${device.speed_limit} km/h, ${decision.severity}. ${address}`);
        fleetAlerts.push({
          alertType: 'overspeed',
          severity: decision.severity,
          id: speedId,
          registrationNumber: device.registration_number,
          title: `Overspeed ${position.speedKmh} km/h`,
          address,
          speed: position.speedKmh,
          eventTime: stamp
        });
      } else if (decision.action === 'extend' || decision.action === 'close') {
        telemetryRepository.progressSpeedAlert(openSpeed.id, {
          speed: position.speedKmh,
          gpsTime: stamp,
          distanceKm: decision.distanceKm,
          severity: decision.severity,
          latitude: position.latitude,
          longitude: position.longitude,
          closingSince: decision.closingSince,
          isOpen: decision.isOpen
        });
        if (decision.notify && openSpeed.driver_event_id) {
          telemetryRepository.updateDriverEventSeverity(openSpeed.driver_event_id, decision.severity);
        }
        if (decision.notify) {
          fleetAlerts.push({
            alertType: 'overspeed',
            severity: decision.severity,
            id: openSpeed.id,
            registrationNumber: device.registration_number,
            title: `Overspeed ${position.speedKmh} km/h`,
            address,
            speed: position.speedKmh,
            eventTime: stamp
          });
        }
      }

      const towing = state.ignition === 0 && position.speedKmh > 2;
      const openTowing = telemetryRepository.findOpenTowingAlert(device.vehicle_id);
      if (towing) {
        if (openTowing) {
          telemetryRepository.extendTowingAlert(openTowing.id, { speed: position.speedKmh, gpsTime });
        } else {
          const towingId = telemetryRepository.insertTowingAlert({
            tenantId: device.tenant_id,
            vehicleId: device.vehicle_id,
            speed: position.speedKmh,
            latitude: position.latitude,
            longitude: position.longitude,
            address,
            gpsTime
          });
          placeTargets.towingAlertId = towingId;
          telemetryRepository.insertNotification({
            tenantId: device.tenant_id,
            vehicleId: device.vehicle_id,
            title: `Towing: ${device.registration_number}`,
            message: `${device.registration_number} is moving at ${position.speedKmh} km/h with ignition off.`,
            type: 'towing'
          });
          fleetAlerts.push({
            alertType: 'towing',
            id: towingId,
            registrationNumber: device.registration_number,
            title: `Towing ${position.speedKmh} km/h`,
            address,
            speed: position.speedKmh,
            eventTime: gpsTime || new Date().toISOString()
          });
          notify('towing', `Towing: ${device.registration_number} is moving at ${position.speedKmh} km/h with ignition off. ${address}`);
        }
      } else if (openTowing) {
        telemetryRepository.closeTowingAlert(openTowing.id, gpsTime);
      }

      if (canonical.alert?.eventType && canonical.alert.eventType !== 'OVERSPEEDING') {
        const behaviorEvent = recordDriverEvent({
          eventType: canonical.alert.eventType,
          packetType: canonical.alert.packetType || canonical.protocol,
          alertId: canonical.alert.alertId || 0,
          severity: canonical.alert.severity || 'WARNING',
          metricValue: canonical.alert.metricValue || String(position.speedKmh),
          thresholdValue: canonical.alert.thresholdValue || ''
        }, address);
        if (behaviorEvent) driverIntelligenceEvents.push(behaviorEvent);
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
      driverIntelligenceEventCreated: driverIntelligenceEvents[0] || null,
      driverIntelligenceEvents,
      fleetAlerts,
      placeTargets,
      canonical: publicCanonical(canonical),
      ack: ack(imei, 'SUCCESS'),
      smsJobs
    };
  });

  if (outcome.smsJobs?.length) {
    deliverSmsJobs(outcome.smsJobs).catch(() => {});
    delete outcome.smsJobs;
  }

  if (outcome.status === 'PROCESSED' && cacheKey) {
    recentPacketCache.set(cacheKey, nowMs);
    if (recentPacketCache.size > 2000) recentPacketCache.clear();
  }

  if (outcome.status === 'PROCESSED' && outcome.vehicle_id) {
    const targets = outcome.placeTargets;
    if (targets?.vehicleId) {
      lookupPlaceName(outcome.latitude, outcome.longitude).then((place) => {
        if (!place) return;
        telemetryRepository.updateFixAddress({
          ...targets,
          address: formatFix(outcome.latitude, outcome.longitude, place)
        });
      }).catch(() => {});
    }
    for (const event of outcome.driverIntelligenceEvents || []) {
      broadcastWS({ type: 'DRIVER_INTELLIGENCE_EVENT', data: event });
    }
    for (const alert of outcome.fleetAlerts || []) {
      broadcastWS({ type: 'FLEET_ALERT', data: alert });
    }
    broadcastWS({
      type: 'LOCATION_UPDATE',
      data: {
        vehicleId: outcome.vehicle_id,
        imei: outcome.imei,
        latitude: outcome.latitude,
        longitude: outcome.longitude,
        speed: outcome.speed,
        heading: outcome.heading,
        ignition: outcome.ignition,
        movementStatus: outcome.movementStatus,
        timestamp: new Date().toISOString()
      }
    });
  }

  return outcome;
}
