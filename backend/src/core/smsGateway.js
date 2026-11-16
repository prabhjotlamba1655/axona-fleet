const DEFAULTS = {
  url: 'https://sms.axona.in/SMSApi/send',
  userId: 'axonasoftware',
  senderId: 'AXONAT',
  entityId: '1101662370000099232',
  templateId: '1177179214957905146'
};

/** Registered "Bulk SMS & Call" text. DLT rejects any other wording on this template id. */
export const APPROVED_SMS_TEXT = 'Send Bulk SMS to students & parents instantly. Send update on admission, fee reminder, event & notices easily. Call 9773936790 -Axona Software LLP';

/** India numbers leave the gateway as 91 followed by 10 digits. */
export function normalizeSmsMobile(value) {
  const digits = String(value || '').replace(/\D/g, '');
  if (digits.length === 10) return `91${digits}`;
  if (digits.length === 11 && digits.startsWith('0')) return `91${digits.slice(1)}`;
  if (digits.length === 12 && digits.startsWith('91')) return digits;
  if (digits.length >= 11 && digits.length <= 15) return digits;
  return '';
}

export function readSmsConfig(env = process.env) {
  const password = String(env.SMS_PASSWORD || '').trim();
  const templateId = String(env.SMS_DLT_TEMPLATE_ID || '').trim() || DEFAULTS.templateId;
  const url = String(env.SMS_API_URL || DEFAULTS.url).trim().replace(/\/$/, '');
  return {
    url: url.endsWith('/send') ? url : `${url}/send`,
    userId: String(env.SMS_USER_ID || DEFAULTS.userId).trim(),
    password,
    senderId: String(env.SMS_SENDER_ID || DEFAULTS.senderId).trim(),
    entityId: String(env.SMS_DLT_ENTITY_ID || DEFAULTS.entityId).trim(),
    templateId,
    message: String(env.SMS_MESSAGE || '').trim() || APPROVED_SMS_TEXT,
    ready: Boolean(password)
  };
}

export function templateIdFor(kind, env = process.env) {
  const specific = kind ? String(env[`SMS_DLT_TEMPLATE_${String(kind).toUpperCase()}`] || '').trim() : '';
  return specific || String(env.SMS_DLT_TEMPLATE_ID || '').trim() || DEFAULTS.templateId;
}

/** Form fields from the sms.axona.in "Send Quick SMS" request. */
export function quickSmsFields({ mobile, message, templateId, config }) {
  return {
    userid: config.userId,
    password: config.password,
    mobile,
    senderid: config.senderId,
    dltEntityId: config.entityId,
    msg: message,
    sendMethod: 'quick',
    msgType: 'text',
    dltTemplateId: templateId,
    output: 'json',
    duplicatecheck: 'true'
  };
}

export function interpretSmsResponse(httpOk, text) {
  let payload = null;
  try {
    payload = JSON.parse(text);
  } catch {
    payload = null;
  }
  const status = String(payload?.status || payload?.response?.status || '').toLowerCase();
  const code = String(payload?.statusCode || payload?.response?.code || payload?.code || '');
  const reason = String(payload?.reason || payload?.response?.reason || payload?.message || text || '').slice(0, 180);
  if (payload) {
    const ok = httpOk && (status === 'success' || code === '200') && status !== 'error';
    return { ok, reason: reason || (ok ? 'success' : 'rejected') };
  }
  if (httpOk && /success/i.test(text) && !/error|fail/i.test(text)) return { ok: true, reason: 'success' };
  return { ok: false, reason: reason || 'rejected' };
}

export async function sendQuickSms({ mobile, message, templateId, config, fetchImpl = fetch }) {
  const form = new FormData();
  const fields = quickSmsFields({ mobile, message, templateId, config });
  for (const [key, value] of Object.entries(fields)) form.append(key, String(value ?? ''));
  const response = await fetchImpl(config.url, {
    method: 'POST',
    body: form,
    signal: AbortSignal.timeout(10000)
  });
  const text = await response.text();
  return interpretSmsResponse(response.ok, text);
}
