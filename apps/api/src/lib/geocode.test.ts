import { geocode, geocodeSearch, haversineMiles } from './geocode.js';

describe('geocode helpers', () => {
  it('returns null for empty input', async () => {
    await expect(geocode('')).resolves.toBeNull();
    await expect(geocodeSearch('')).resolves.toEqual([]);
  });

  it('returns null/[] on fetch failures', async () => {
    const originalFetch = global.fetch;
    global.fetch = jest.fn().mockRejectedValue(new Error('network')) as unknown as typeof fetch;

    await expect(geocode('NYC')).resolves.toBeNull();
    await expect(geocodeSearch('NYC')).resolves.toEqual([]);

    global.fetch = originalFetch;
  });

  it('calculates haversine miles', () => {
    const miles = haversineMiles(40.7128, -74.006, 34.0522, -118.2437);
    expect(miles).toBeGreaterThan(2400);
    expect(miles).toBeLessThan(2600);
  });
});
