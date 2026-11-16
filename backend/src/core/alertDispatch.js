import { telemetryRepository } from '../db/repositories/telemetryRepository.js';
import { normalizeSmsMobile, readSmsConfig, sendQuickSms, templateIdFor } from './smsGateway.js';

/**
 * Record who should receive an alert. The open dashboard gets it immediately.
 * SMS uses the sms.axona.in Quick SMS call after the ingest transaction commits.
 * WhatsApp and the ERSS 112 handoff stay pending until those gateways are configured.
 */
export function queueOutboundAlerts(repo, { tenantId, vehicleId, kind, body, phones = {} }) {
  const rows = [
    { channel: 'webpush', recipient: 'dashboard', status: 'delivered_to_console' }
  ];
  const sentNumbers = new Set();
  for (const recipient of [phones.owner, phones.alternate, phones.emergency]) {
    if (!recipient) continue;
    const mobile = normalizeSmsMobile(recipient) || String(recipient).trim();
    if (!mobile || sentNumbers.has(mobile)) continue;
    sentNumbers.add(mobile);
    rows.push({ channel: 'sms', recipient: mobile, status: 'pending_config', kind });
  }
  if (phones.owner) {
    rows.push({ channel: 'whatsapp', recipient: String(phones.owner), status: 'pending_config' });
  }
  if (kind === 'panic') {
    rows.push({ channel: 'erss112', recipient: '112', status: 'pending_config' });
  }
  for (const row of rows) {
    row.kind = kind;
    row.id = repo.insertDispatch({
      tenantId,
      vehicleId,
      channel: row.channel,
      recipient: row.recipient,
      body,
      status: row.status
    });
    row.body = body;
  }
  return rows;
}

export async function deliverSmsJobs(rows) {
  if (process.env.NODE_ENV === 'test') return;
  const config = readSmsConfig();
  if (!config.ready || !rows?.length) return;
  for (const row of rows) {
    if (row.channel !== 'sms' || !row.id || !row.recipient) continue;
    const templateId = templateIdFor(row.kind);
    const mobile = normalizeSmsMobile(row.recipient);
    if (!templateId || !mobile) continue;
    try {
      const result = await sendQuickSms({
        mobile,
        message: config.message,
        templateId,
        config
      });
      telemetryRepository.updateDispatchStatus(row.id, result.ok ? 'sent' : 'failed');
      if (!result.ok) console.error(`[sms] ${row.id} ${result.reason}`);
    } catch (err) {
      telemetryRepository.updateDispatchStatus(row.id, 'failed');
      console.error(`[sms] ${row.id} ${err.message}`);
    }
  }
}
