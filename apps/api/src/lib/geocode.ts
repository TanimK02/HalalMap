/**
 * Geocode an address string to latitude/longitude using Nominatim (OpenStreetMap).
 * No API key required. Respect Nominatim usage policy: max 1 request per second.
 */

export interface GeocodeResult {
  latitude: number;
  longitude: number;
}

const NOMINATIM_URL = 'https://nominatim.openstreetmap.org/search';

export async function geocode(address: string): Promise<GeocodeResult | null> {
  if (!address?.trim()) return null;
  const query = encodeURIComponent(address.trim());
  const url = `${NOMINATIM_URL}?q=${query}&format=json&limit=1`;
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': 'HalalMap/1.0' },
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { lat?: string; lon?: string }[];
    if (!Array.isArray(data) || data.length === 0) return null;
    const first = data[0];
    const lat = first?.lat != null ? parseFloat(first.lat) : NaN;
    const lon = first?.lon != null ? parseFloat(first.lon) : NaN;
    if (Number.isNaN(lat) || Number.isNaN(lon)) return null;
    return { latitude: lat, longitude: lon };
  } catch {
    return null;
  }
}

/** Haversine distance in miles between two WGS84 points. */
export function haversineMiles(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 3959; // Earth radius in miles
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}
