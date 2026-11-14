import { ais140Adapter } from './ais140Adapter.js';
import { jsonTelemetryAdapter } from './jsonTelemetryAdapter.js';
import { navicNmeaAdapter } from './navicNmeaAdapter.js';
import { teltonikaAdapter } from './teltonikaAdapter.js';

const adapters = [teltonikaAdapter, navicNmeaAdapter, ais140Adapter, jsonTelemetryAdapter];

export function listAdapters() {
  return adapters.map((adapter) => adapter.id);
}

export function registerAdapter(adapter) {
  if (!adapter?.id || typeof adapter.canParse !== 'function' || typeof adapter.parse !== 'function') {
    throw new Error('A protocol adapter needs id, canParse(ctx), and parse(ctx).');
  }
  const existing = adapters.findIndex((item) => item.id === adapter.id);
  if (existing >= 0) adapters.splice(existing, 1);
  adapters.unshift(adapter);
  return adapter.id;
}

export function toContext(input) {
  if (typeof input === 'string') {
    return { raw: input, imei: null, protocolHint: null, envelope: null };
  }

  if (input && typeof input === 'object') {
    const protocolHint = typeof input.protocol === 'string' ? input.protocol : null;
    const imei = input.imei ? String(input.imei) : null;
    const framed = input.packet || input.nmea || input.rawString;
    if (typeof framed === 'string') {
      return { raw: framed, imei, protocolHint, envelope: input };
    }
    return { raw: input, imei, protocolHint, envelope: input };
  }

  return { raw: '', imei: null, protocolHint: null, envelope: null };
}

export function resolveAdapter(ctx) {
  if (ctx.protocolHint) {
    const hinted = adapters.find((adapter) => adapter.id === ctx.protocolHint);
    if (!hinted || !hinted.canParse(ctx)) return null;
    return hinted;
  }
  return adapters.find((adapter) => adapter.canParse(ctx)) || null;
}

export function normalizePayload(input) {
  const ctx = toContext(input);
  const adapter = resolveAdapter(ctx);
  if (!adapter) {
    return {
      ok: false,
      error: 'No protocol adapter matched the payload. Supported: navic-nmea ($GNGGA/$GNRMC), ais140, json, teltonika.',
      protocol: null,
      rawForLog: stringifyRaw(ctx.raw)
    };
  }

  try {
    const parsed = adapter.parse(ctx);
    return {
      ...parsed,
      protocol: adapter.id,
      rawForLog: stringifyRaw(ctx.raw)
    };
  } catch (err) {
    return {
      ok: false,
      error: err.message,
      protocol: adapter.id,
      rawForLog: stringifyRaw(ctx.raw)
    };
  }
}

function stringifyRaw(raw) {
  if (typeof raw === 'string') return raw;
  try {
    return JSON.stringify(raw);
  } catch {
    return String(raw);
  }
}
