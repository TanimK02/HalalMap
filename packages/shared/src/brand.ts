export const brand = {
  primary: '#0F7A5C',
  secondary: '#3ECF8E',
  background: '#F7F7F5',
  surface: '#FFFFFF',
  textPrimary: '#1F2933',
  textSecondary: '#6B7280',
  accent: '#F59E0B',
} as const;

export const halalBadgeStyles: Record<
  string,
  { bg: string; text: string }
> = {
  CERTIFIED_HALAL: { bg: '#0F7A5C', text: '#FFFFFF' },
  MUSLIM_OWNED: { bg: '#3ECF8E', text: '#1F2933' },
  HALAL_FRIENDLY: { bg: '#E5E7EB', text: '#0F7A5C' },
};
