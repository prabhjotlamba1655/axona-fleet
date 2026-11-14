import { buildCanonical, xorChecksum } from '../canonicalTelemetry.js';

function nmeaToDecimal(raw, hemisphere) {
  const value = Number.parseFloat(raw);
  if (!Number.isFinite(value)) return null;
  const degrees = Math.floor(value / 100);
  const minutes = value - (degrees * 100);
  let decimal = degrees + (minutes / 60);
  if (hemisphere === 'S' || hemisphere === 'W') decimal = -decimal;
  return decimal;
}

function splitSentences(raw) {
  return String(raw)
    .split(/[\r\n]+|(?=\$GN)/)
    .map((line) => line.trim())
    .filter((line) => line.startsWith('$GN'));
}

function parseSentence(sentence) {
  const star = sentence.lastIndexOf('*');
  const body = sentence.slice(1, star === -1 ? undefined : star);
  const checksum = star === -1 ? null : sentence.slice(star + 1).trim().toUpperCase();
  if (checksum && xorChecksum(body) !== checksum) {
    return { error: `NMEA checksum mismatch on ${body.split(',')[0]}` };
  }
  return { fields: body.split(',') };
}

function kind(fields) {
  return (fields[0] || '').slice(-3).toUpperCase();
}

function gpsTimeFromRmc(timeField, dateField) {
  if (!timeField || !dateField || dateField.length < 6 || timeField.length < 6) return null;
  const day = dateField.slice(0, 2);
  const month = dateField.slice(2, 4);
  const year = `20${dateField.slice(4, 6)}`;
  const hours = timeField.slice(0, 2);
  const minutes = timeField.slice(2, 4);
  const seconds = timeField.slice(4, 6);
  return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}Z`;
}

/**
 * NavIC / GNSS NMEA. Accepts $GNGGA, $GNRMC, or both in one payload.
 * RMC supplies speed in knots and course. GGA supplies altitude and satellites.
 * IMEI is not part of NMEA, so the ingest envelope must carry it.
 */
export const navicNmeaAdapter = {
  id: 'navic-nmea',

  canParse(ctx) {
    if (typeof ctx.raw !== 'string') return false;
    if (ctx.protocolHint && ctx.protocolHint !== this.id) return false;
    return ctx.protocolHint === this.id || /\$GN(GGA|RMC)\b/.test(ctx.raw);
  },

  parse(ctx) {
    const sentences = splitSentences(ctx.raw);
    if (sentences.length === 0) {
      return { ok: false, error: 'No $GNGGA or $GNRMC sentence found' };
    }

    let gga = null;
    let rmc = null;
    for (const sentence of sentences) {
      const parsed = parseSentence(sentence);
      if (parsed.error) return { ok: false, error: parsed.error };
      const sentenceKind = kind(parsed.fields);
      if (sentenceKind === 'GGA') gga = parsed.fields;
      if (sentenceKind === 'RMC') rmc = parsed.fields;
    }

    if (!gga && !rmc) {
      return { ok: false, error: 'No $GNGGA or $GNRMC sentence found' };
    }

    const position = rmc || gga;
    const isRmc = kind(position) === 'RMC';
    const latitude = nmeaToDecimal(position[isRmc ? 3 : 2], position[isRmc ? 4 : 3]);
    const longitude = nmeaToDecimal(position[isRmc ? 5 : 4], position[isRmc ? 6 : 5]);
    const speedKnots = rmc ? Number.parseFloat(rmc[7]) : 0;
    const speedKmh = Number.isFinite(speedKnots) ? speedKnots * 1.852 : 0;

    return buildCanonical({
      protocol: this.id,
      imei: ctx.imei,
      latitude,
      longitude,
      altitudeMeters: gga ? Number.parseFloat(gga[9]) : 0,
      speedKmh,
      headingDegrees: rmc ? Number.parseFloat(rmc[8]) : 0,
      satellites: gga ? Number.parseInt(gga[7], 10) : 0,
      fixQuality: gga ? gga[6] : (rmc && rmc[2] === 'A' ? 'A' : 'V'),
      ignition: speedKmh > 3 ? 1 : 0,
      mainPower: 1,
      panic: 0,
      tamper: 0,
      gpsTime: rmc ? gpsTimeFromRmc(rmc[1], rmc[9]) : null
    });
  }
};
