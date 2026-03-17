/**
 * Sales tax calculation. Phase 1: env-based default rate and optional state map.
 * Taxable amount = subtotal + fee (delivery/pickup fee). Swap in Stripe Tax or TaxJar later via same interface.
 */

export type TaxJurisdiction = {
  state?: string | null;
  postalCode?: string | null;
  country?: string | null;
};

function isTaxEnabled(): boolean {
  const raw = process.env.TAX_ENABLED;
  if (raw == null || raw === '') return true; // default on; set TAX_ENABLED=false to disable
  return raw.toLowerCase() === 'true' || raw === '1';
}

function getDefaultTaxPercent(): number {
  const raw = process.env.DEFAULT_TAX_PERCENT;
  if (raw == null || raw === '') return 0;
  const n = parseFloat(raw);
  return Number.isNaN(n) || n < 0 ? 0 : n;
}

/** Optional state override: STATE_TAX_CA=9.5 means California 9.5%. Keys are uppercase state code. */
function getStateTaxPercent(state: string | null | undefined): number | null {
  if (!state || typeof state !== 'string') return null;
  const key = `STATE_TAX_${state.toUpperCase().trim()}`;
  const raw = process.env[key];
  if (raw == null || raw === '') return null;
  const n = parseFloat(raw);
  return Number.isNaN(n) || n < 0 ? null : n;
}

/**
 * Get sales tax in cents for a taxable amount (e.g. subtotal + fee) and jurisdiction.
 * Uses TAX_ENABLED, DEFAULT_TAX_PERCENT, and optional STATE_TAX_XX env vars.
 */
export function getTaxCents(
  taxableAmountCents: number,
  jurisdiction: TaxJurisdiction
): number {
  const amount = Math.round(Number(taxableAmountCents));
  if (!isTaxEnabled() || !Number.isFinite(amount) || amount <= 0) return 0;

  const state = jurisdiction.state?.trim() || null;
  const statePercent = getStateTaxPercent(state);
  const percent = statePercent ?? getDefaultTaxPercent();
  if (percent <= 0) return 0;

  return Math.round((amount * percent) / 100);
}
