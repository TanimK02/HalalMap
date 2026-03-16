/**
 * Geocode an address string to latitude/longitude using Nominatim (OpenStreetMap).
 * No API key required. Respect Nominatim usage policy: max 1 request per second.
 */

export interface GeocodeResult {
  latitude: number;
  longitude: number;
}

export interface GeocodeSuggestion {
  displayName: string;
  latitude: number;
  longitude: number;
  address?: {
    street: string;
    city: string;
    state?: string;
    postalCode?: string;
  };
}

type NominatimHit = {
  lat?: string;
  lon?: string;
  display_name?: string;
  address?: {
    road?: string;
    house_number?: string;
    city?: string;
    town?: string;
    village?: string;
    state?: string;
    postcode?: string;
  };
};

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
    const data = (await res.json()) as NominatimHit[];
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

/**
 * Geocode with multiple results and address details for suggestions/autocomplete.
 * Respect Nominatim usage: max 1 request per second.
 */
export async function geocodeSearch(
  address: string,
  limit = 5
): Promise<GeocodeSuggestion[]> {
  if (!address?.trim()) return [];
  const capped = Math.min(40, Math.max(1, Math.floor(limit)));
  const query = encodeURIComponent(address.trim());
  const url = `${NOMINATIM_URL}?q=${query}&format=json&addressdetails=1&limit=${capped}`;
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': 'HalalMap/1.0' },
    });
    if (!res.ok) return [];
    const data = (await res.json()) as NominatimHit[];
    if (!Array.isArray(data)) return [];
    const results: GeocodeSuggestion[] = [];
    for (const item of data) {
      const lat = item?.lat != null ? parseFloat(item.lat) : NaN;
      const lon = item?.lon != null ? parseFloat(item.lon) : NaN;
      if (Number.isNaN(lat) || Number.isNaN(lon)) continue;
      const addr = item.address;
      const street = [addr?.house_number, addr?.road].filter(Boolean).join(' ').trim();
      const city = addr?.city ?? addr?.town ?? addr?.village ?? '';
      const state = addr?.state;
      const postalCode = addr?.postcode;
      const suggestion: GeocodeSuggestion = {
        displayName: item.display_name ?? '',
        latitude: lat,
        longitude: lon,
        address:
          street || city || state || postalCode
            ? {
                street: street || city || '—',
                city,
                ...(state != null && state !== '' && { state }),
                ...(postalCode != null && postalCode !== '' && { postalCode }),
              }
            : undefined,
      };
      results.push(suggestion);
    }
    return results;
  } catch {
    return [];
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
