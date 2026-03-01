/**
 * Build a URL to open directions in the device Maps app.
 * Prefers coordinates when available; falls back to address search.
 */

export function getDirectionsUrl(
  latitude: number | null | undefined,
  longitude: number | null | undefined,
  address: string
): string {
  if (
    latitude != null &&
    longitude != null &&
    typeof latitude === 'number' &&
    typeof longitude === 'number' &&
    !Number.isNaN(latitude) &&
    !Number.isNaN(longitude)
  ) {
    return `https://www.google.com/maps/dir/?api=1&destination=${latitude},${longitude}`;
  }
  if (address && address.trim()) {
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address.trim())}`;
  }
  return '';
}
