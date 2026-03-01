/**
 * Utilities for restaurant business hours (schema: { "mon": { "open": "09:00", "close": "21:00" }, ... }).
 * Uses device local date/time for "today" and "now".
 * Day keys: sun, mon, tue, wed, thu, fri, sat (JS getDay(): 0=Sun .. 6=Sat).
 */

export type DayHours = { open?: string; close?: string };
export type BusinessHoursMap = Record<string, DayHours> | null | undefined;

const DAY_KEYS = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'] as const;

function getDayKey(date: Date): string {
  return DAY_KEYS[date.getDay()];
}

function parseBusinessHours(hours: BusinessHoursMap): Record<string, DayHours> | null {
  if (hours == null || typeof hours !== 'object') return null;
  const out: Record<string, DayHours> = {};
  for (const key of Object.keys(hours)) {
    const day = (hours as Record<string, unknown>)[key];
    if (day && typeof day === 'object' && day !== null) {
      const d = day as Record<string, unknown>;
      const open = typeof d.open === 'string' ? d.open : undefined;
      const close = typeof d.close === 'string' ? d.close : undefined;
      if (open || close) out[key.toLowerCase()] = { open, close };
    }
  }
  return Object.keys(out).length > 0 ? out : null;
}

/** Get today's hours (open/close strings like "09:00"/"21:00") or null if closed/no data. */
export function getTodayHours(
  businessHours: BusinessHoursMap,
  date: Date = new Date()
): { open: string; close: string } | null {
  const map = parseBusinessHours(businessHours);
  if (!map) return null;
  const key = getDayKey(date);
  const day = map[key];
  if (!day?.open || !day?.close) return null;
  return { open: day.open, close: day.close };
}

function parseTime24(s: string): number | null {
  const match = /^(\d{1,2}):(\d{2})$/.exec(s.trim());
  if (!match) return null;
  const h = parseInt(match[1], 10);
  const m = parseInt(match[2], 10);
  if (h < 0 || h > 23 || m < 0 || m > 59) return null;
  return h * 60 + m;
}

/** Whether the restaurant is open right now (or at given date). */
export function isOpenNow(businessHours: BusinessHoursMap, now: Date = new Date()): boolean {
  const today = getTodayHours(businessHours, now);
  if (!today) return false;
  const openM = parseTime24(today.open);
  const closeM = parseTime24(today.close);
  if (openM == null || closeM == null) return false;
  const currentM = now.getHours() * 60 + now.getMinutes();
  if (openM < closeM) return currentM >= openM && currentM < closeM;
  return currentM >= openM || currentM < closeM;
}

export type HoursStatus = {
  status: 'open' | 'closed';
  todayHours: { open: string; close: string } | null;
  closesAt?: string;
  opensAt?: string;
};

/** Get open/closed status and optional closes/opens time for labels. */
export function getHoursStatus(
  businessHours: BusinessHoursMap,
  now: Date = new Date()
): HoursStatus {
  const todayHours = getTodayHours(businessHours, now);
  const open = isOpenNow(businessHours, now);

  if (!todayHours) {
    return { status: 'closed', todayHours: null };
  }

  if (open) {
    return {
      status: 'open',
      todayHours,
      closesAt: todayHours.close,
    };
  }

  const openM = parseTime24(todayHours.open);
  const currentM = now.getHours() * 60 + now.getMinutes();
  let opensAt: string | undefined;
  if (openM != null && currentM < openM) {
    opensAt = todayHours.open;
  }

  return {
    status: 'closed',
    todayHours,
    opensAt,
  };
}

/** Format 24h string "09:00" / "21:00" to "9 AM" / "9 PM". */
export function formatTime24(time: string): string {
  const m = parseTime24(time);
  if (m == null) return time;
  const h = Math.floor(m / 60);
  const min = m % 60;
  if (h === 0) return min === 0 ? '12 AM' : `12:${min.toString().padStart(2, '0')} AM`;
  if (h === 12) return min === 0 ? '12 PM' : `12:${min.toString().padStart(2, '0')} PM`;
  if (h < 12) return min === 0 ? `${h} AM` : `${h}:${min.toString().padStart(2, '0')} AM`;
  const h12 = h - 12;
  return min === 0 ? `${h12} PM` : `${h12}:${min.toString().padStart(2, '0')} PM`;
}

/** Format today's hours line: "Today 9 AM – 9 PM". */
export function formatTodayHoursLine(todayHours: { open: string; close: string } | null): string {
  if (!todayHours) return '';
  return `Today ${formatTime24(todayHours.open)} – ${formatTime24(todayHours.close)}`;
}

/** Short label for cards/detail: "Open now", "Closes 9 PM", "Closed", "Opens 9 AM". Empty primary when no hours. */
export function getHoursLabel(businessHours: BusinessHoursMap): {
  primary: string;
  secondary?: string;
  todayLine?: string;
} {
  const map = parseBusinessHours(businessHours);
  if (!map) return { primary: '' };

  const status = getHoursStatus(businessHours);
  const { todayHours } = status;

  if (status.status === 'open') {
    return {
      primary: 'Open now',
      secondary: status.closesAt ? `Closes ${formatTime24(status.closesAt)}` : undefined,
      todayLine: todayHours ? formatTodayHoursLine(todayHours) : undefined,
    };
  }

  return {
    primary: 'Closed',
    secondary: status.opensAt ? `Opens ${formatTime24(status.opensAt)}` : undefined,
    todayLine: todayHours ? formatTodayHoursLine(todayHours) : undefined,
  };
}
