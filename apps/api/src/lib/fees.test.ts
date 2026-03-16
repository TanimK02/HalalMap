import { getPlatformFeeCents } from './fees.js';

describe('getPlatformFeeCents', () => {
  const origFlat = process.env.PLATFORM_FEE_FLAT_CENTS;
  const origPercent = process.env.PLATFORM_FEE_PERCENT;

  afterEach(() => {
    if (origFlat !== undefined) process.env.PLATFORM_FEE_FLAT_CENTS = origFlat;
    else delete process.env.PLATFORM_FEE_FLAT_CENTS;
    if (origPercent !== undefined) process.env.PLATFORM_FEE_PERCENT = origPercent;
    else delete process.env.PLATFORM_FEE_PERCENT;
  });

  it('returns 0 when both env vars are unset', () => {
    delete process.env.PLATFORM_FEE_FLAT_CENTS;
    delete process.env.PLATFORM_FEE_PERCENT;
    expect(getPlatformFeeCents(10000)).toBe(0);
  });

  it('returns flat only when PLATFORM_FEE_PERCENT is unset', () => {
    process.env.PLATFORM_FEE_FLAT_CENTS = '50';
    delete process.env.PLATFORM_FEE_PERCENT;
    expect(getPlatformFeeCents(10000)).toBe(50);
  });

  it('returns percent of subtotal when PLATFORM_FEE_FLAT_CENTS is unset', () => {
    delete process.env.PLATFORM_FEE_FLAT_CENTS;
    process.env.PLATFORM_FEE_PERCENT = '5';
    expect(getPlatformFeeCents(10000)).toBe(500); // 5% of 10000 cents
  });

  it('returns flat + percent when both are set', () => {
    process.env.PLATFORM_FEE_FLAT_CENTS = '25';
    process.env.PLATFORM_FEE_PERCENT = '2';
    expect(getPlatformFeeCents(10000)).toBe(225); // 25 + 200
  });

  it('rounds percent portion to integer cents', () => {
    process.env.PLATFORM_FEE_FLAT_CENTS = '0';
    process.env.PLATFORM_FEE_PERCENT = '3';
    expect(getPlatformFeeCents(333)).toBe(10); // 9.99 -> 10
  });

  it('treats invalid or negative env as 0', () => {
    process.env.PLATFORM_FEE_FLAT_CENTS = 'invalid';
    process.env.PLATFORM_FEE_PERCENT = '-5';
    expect(getPlatformFeeCents(10000)).toBe(0);
  });

  it('returns non-negative result', () => {
    process.env.PLATFORM_FEE_FLAT_CENTS = '0';
    process.env.PLATFORM_FEE_PERCENT = '0';
    expect(getPlatformFeeCents(10000)).toBe(0);
  });
});
