const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;

/** UTC stamp for 00:00 in India on the calendar day of `now`. Stored times compare against this. */
export function istMidnightUtcStamp(now = new Date()) {
  const ist = new Date(now.getTime() + IST_OFFSET_MS);
  const utcMidnightOfIstDate = Date.UTC(ist.getUTCFullYear(), ist.getUTCMonth(), ist.getUTCDate());
  return new Date(utcMidnightOfIstDate - IST_OFFSET_MS).toISOString().slice(0, 19).replace('T', ' ');
}
