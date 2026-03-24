import { describe, expect, it } from '@jest/globals';
import { getDirectionsUrl } from './directions';

describe('directions', () => {
  it('prefers coordinate URL when lat/lng are present', () => {
    const url = getDirectionsUrl(40.1, -73.2, '123 Main St');
    expect(url).toContain('maps/dir');
    expect(url).toContain('destination=40.1,-73.2');
  });

  it('falls back to address query URL', () => {
    const url = getDirectionsUrl(null, null, '123 Main St, NYC');
    expect(url).toContain('maps/search');
    expect(url).toContain(encodeURIComponent('123 Main St, NYC'));
  });

  it('returns empty string when both location and address are missing', () => {
    expect(getDirectionsUrl(undefined, undefined, '')).toBe('');
  });
});
