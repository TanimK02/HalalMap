import { getTaxCents } from './tax.js';

describe('getTaxCents', () => {
  const origEnabled = process.env.TAX_ENABLED;
  const origDefault = process.env.DEFAULT_TAX_PERCENT;
  const origStateCA = process.env.STATE_TAX_CA;

  afterEach(() => {
    if (origEnabled !== undefined) process.env.TAX_ENABLED = origEnabled;
    else delete process.env.TAX_ENABLED;
    if (origDefault !== undefined) process.env.DEFAULT_TAX_PERCENT = origDefault;
    else delete process.env.DEFAULT_TAX_PERCENT;
    if (origStateCA !== undefined) process.env.STATE_TAX_CA = origStateCA;
    else delete process.env.STATE_TAX_CA;
  });

  it('returns 0 when taxable amount is 0', () => {
    process.env.TAX_ENABLED = 'true';
    process.env.DEFAULT_TAX_PERCENT = '8';
    expect(getTaxCents(0, { state: 'CA', country: 'US' })).toBe(0);
  });

  it('returns 0 when TAX_ENABLED is false', () => {
    process.env.TAX_ENABLED = 'false';
    process.env.DEFAULT_TAX_PERCENT = '8';
    expect(getTaxCents(10000, { state: 'CA', country: 'US' })).toBe(0);
  });

  it('uses DEFAULT_TAX_PERCENT when set and no state override', () => {
    process.env.TAX_ENABLED = 'true';
    process.env.DEFAULT_TAX_PERCENT = '8.25';
    expect(getTaxCents(10000, { country: 'US' })).toBe(825); // 8.25% of 10000 cents
  });

  it('uses STATE_TAX_XX when state provided', () => {
    process.env.TAX_ENABLED = 'true';
    process.env.DEFAULT_TAX_PERCENT = '0';
    process.env.STATE_TAX_CA = '9.5';
    expect(getTaxCents(10000, { state: 'CA', country: 'US' })).toBe(950);
  });

  it('returns 0 when no rate (default 0 and no state override)', () => {
    delete process.env.TAX_ENABLED;
    delete process.env.DEFAULT_TAX_PERCENT;
    expect(getTaxCents(10000, { state: 'NY', country: 'US' })).toBe(0);
  });

  it('rounds to integer cents', () => {
    process.env.TAX_ENABLED = 'true';
    process.env.DEFAULT_TAX_PERCENT = '8.25';
    expect(getTaxCents(1000, { country: 'US' })).toBe(83); // 82.5 -> 83
  });
});
