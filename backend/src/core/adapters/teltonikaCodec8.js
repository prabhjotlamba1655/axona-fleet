/**
 * Teltonika Codec 8 and Codec 8 Extended AVL frames.
 * The FMB920 opens a TCP session, sends its IMEI, and then sends these frames.
 * CRC-16/IBM covers the bytes from the codec id through the second record count.
 */

export function crc16Ibm(buffer) {
  let crc = 0;
  for (let i = 0; i < buffer.length; i += 1) {
    crc ^= buffer[i];
    for (let bit = 0; bit < 8; bit += 1) {
      if (crc & 1) crc = (crc >>> 1) ^ 0xA001;
      else crc >>>= 1;
    }
  }
  return crc & 0xffff;
}

/**
 * First packet on a connection: 2-byte length + ASCII IMEI.
 * Returns null when more bytes are required.
 */
export function takeImeiGreeting(buffer) {
  if (buffer.length < 2) return null;
  const length = buffer.readUInt16BE(0);
  if (length < 8 || length > 20) {
    return { error: `Unexpected IMEI length ${length}` };
  }
  if (buffer.length < 2 + length) return null;
  const imei = buffer.subarray(2, 2 + length).toString('ascii');
  if (!/^\d{8,20}$/.test(imei)) {
    return { error: `IMEI is not numeric: ${imei}`, bytes: 2 + length };
  }
  return { imei, bytes: 2 + length };
}

/**
 * One AVL packet: 4-byte preamble, 4-byte data length, data, 4-byte CRC.
 * Returns null when the frame is not complete yet.
 */
export function takeAvlPacket(buffer) {
  if (buffer.length < 8) return null;
  if (buffer.readUInt32BE(0) !== 0) {
    return { error: 'AVL preamble is not zero' };
  }
  const dataLength = buffer.readUInt32BE(4);
  if (dataLength < 3 || dataLength > 128 * 1024) {
    return { error: `AVL data length ${dataLength} is invalid` };
  }
  const total = 8 + dataLength + 4;
  if (buffer.length < total) return null;

  const data = buffer.subarray(8, 8 + dataLength);
  const crcReceived = buffer.readUInt32BE(8 + dataLength);
  if (crc16Ibm(data) !== crcReceived) {
    return { error: 'Codec 8 CRC mismatch', bytes: total, records: [] };
  }

  try {
    return { bytes: total, records: readRecords(data) };
  } catch (err) {
    return { error: err.message, bytes: total, records: [] };
  }
}

function readRecords(data) {
  const codecId = data.readUInt8(0);
  if (codecId !== 0x08 && codecId !== 0x8e) {
    throw new Error(`Unsupported Teltonika codec 0x${codecId.toString(16)}`);
  }

  const count = data.readUInt8(1);
  let offset = 2;
  const records = [];
  for (let index = 0; index < count; index += 1) {
    const timestamp = data.readBigUInt64BE(offset);
    offset += 8;
    offset += 1;
    const longitude = data.readInt32BE(offset) / 10_000_000;
    offset += 4;
    const latitude = data.readInt32BE(offset) / 10_000_000;
    offset += 4;
    const altitude = data.readUInt16BE(offset);
    offset += 2;
    const angle = data.readUInt16BE(offset);
    offset += 2;
    const satellites = data.readUInt8(offset);
    offset += 1;
    const speed = data.readUInt16BE(offset);
    offset += 2;
    const parsed = codecId === 0x08 ? readIoCodec8(data, offset) : readIoCodec8Extended(data, offset);
    offset = parsed.offset;
    const ignition = parsed.io[239];
    records.push({
      latitude,
      longitude,
      altitude,
      speed,
      angle,
      satellites,
      ignition: ignition ? 1 : 0,
      timestamp: new Date(Number(timestamp)).toISOString(),
      io: parsed.io
    });
  }

  const repeated = data.readUInt8(offset);
  if (repeated !== count) {
    throw new Error(`Codec 8 record count mismatch ${count} vs ${repeated}`);
  }
  return records;
}

function readUnsigned(data, offset, size) {
  if (size === 1) return data.readUInt8(offset);
  if (size === 2) return data.readUInt16BE(offset);
  if (size === 4) return data.readUInt32BE(offset);
  return Number(data.readBigUInt64BE(offset));
}

function readIoCodec8(data, offset) {
  const io = {};
  offset += 2;
  for (const size of [1, 2, 4, 8]) {
    const count = data.readUInt8(offset);
    offset += 1;
    for (let index = 0; index < count; index += 1) {
      const id = data.readUInt8(offset);
      offset += 1;
      io[id] = readUnsigned(data, offset, size);
      offset += size;
    }
  }
  return { io, offset };
}

function readIoCodec8Extended(data, offset) {
  const io = {};
  offset += 4;
  for (const size of [1, 2, 4, 8]) {
    const count = data.readUInt16BE(offset);
    offset += 2;
    for (let index = 0; index < count; index += 1) {
      const id = data.readUInt16BE(offset);
      offset += 2;
      io[id] = readUnsigned(data, offset, size);
      offset += size;
    }
  }
  const variableCount = data.readUInt16BE(offset);
  offset += 2;
  for (let index = 0; index < variableCount; index += 1) {
    offset += 2;
    const length = data.readUInt16BE(offset);
    offset += 2 + length;
  }
  return { io, offset };
}
