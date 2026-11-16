const cache = new Map();

function cacheKey(latitude, longitude) {
  return `${Number(latitude).toFixed(3)},${Number(longitude).toFixed(3)}`;
}

/**
 * Reverse geocode a fix into a place name. Tests and a failed lookup
 * leave the coordinate string already stored on the row.
 */
export async function lookupPlaceName(latitude, longitude) {
  if (process.env.NODE_ENV === 'test') return null;
  if (!Number.isFinite(Number(latitude)) || !Number.isFinite(Number(longitude))) return null;
  const key = cacheKey(latitude, longitude);
  if (cache.has(key)) return cache.get(key);

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 1500);
  try {
    const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${latitude}&lon=${longitude}`;
    const response = await fetch(url, {
      signal: controller.signal,
      headers: { 'User-Agent': 'AxonaFleet/1.0 (fleet location labels)' }
    });
    if (!response.ok) return null;
    const body = await response.json();
    const name = body.display_name || body.name || null;
    if (name) cache.set(key, name);
    return name;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

export function formatFix(latitude, longitude, placeName) {
  const coords = `${Number(latitude).toFixed(5)}, ${Number(longitude).toFixed(5)}`;
  return placeName ? `${placeName} (${coords})` : coords;
}
