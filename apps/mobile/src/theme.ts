export const brand = {
  primary: '#0F7A5C',
  secondary: '#3ECF8E',
  background: '#F7F7F5',
  surface: '#FFFFFF',
  textPrimary: '#1F2933',
  textSecondary: '#6B7280',
  accent: '#F59E0B',
};

export const halalBadgeStyles: Record<string, { bg: string; text: string }> = {
  CERTIFIED_HALAL: { bg: '#0F7A5C', text: '#FFFFFF' },
  MUSLIM_OWNED: { bg: '#3ECF8E', text: '#1F2933' },
  HALAL_FRIENDLY: { bg: '#E5E7EB', text: '#0F7A5C' },
};

export const HALAL_LABELS: Record<string, string> = {
  CERTIFIED_HALAL: 'Certified Halal',
  MUSLIM_OWNED: 'Muslim-Owned',
  HALAL_FRIENDLY: 'Halal-Friendly',
};

/** Colors for open/closed status on list cards (DoorDash-style). */
export const hoursStatusColors = {
  open: { bg: '#D1FAE5', text: '#065F46' },
  closed: { bg: '#FEE2E2', text: '#991B1B' },
};
