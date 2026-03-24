import { describe, expect, it } from '@jest/globals';
import { formatTime24, getHoursStatus, isOpenNow } from './businessHours';

const hours = {
  mon: { open: '09:00', close: '21:00' },
  tue: { open: '10:00', close: '22:00' },
};

describe('businessHours', () => {
  it('returns open during open hours', () => {
    const now = new Date(2026, 2, 23, 15, 0, 0);
    expect(isOpenNow(hours, now)).toBe(true);
    expect(getHoursStatus(hours, now).status).toBe('open');
  });

  it('returns closed outside open hours', () => {
    const now = new Date(2026, 2, 23, 23, 0, 0);
    expect(isOpenNow(hours, now)).toBe(false);
    expect(getHoursStatus(hours, now).status).toBe('closed');
  });

  it('formats 24-hour time labels', () => {
    expect(formatTime24('09:00')).toBe('9 AM');
    expect(formatTime24('12:30')).toBe('12:30 PM');
    expect(formatTime24('21:00')).toBe('9 PM');
  });
});
