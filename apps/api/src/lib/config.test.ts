import { getConfig, isDeliveryEnabled, isStripeConnectEnabled } from './config.js';

describe('config helpers', () => {
  const original = { ...process.env };

  afterEach(() => {
    process.env = { ...original };
  });

  it('treats delivery as enabled by default', () => {
    delete process.env.ENABLE_DELIVERY;
    expect(isDeliveryEnabled()).toBe(true);
  });

  it('disables delivery when explicitly false', () => {
    process.env.ENABLE_DELIVERY = 'false';
    expect(isDeliveryEnabled()).toBe(false);
  });

  it('enables stripe connect only when true', () => {
    process.env.STRIPE_CONNECT_ENABLED = 'true';
    expect(isStripeConnectEnabled()).toBe(true);
    process.env.STRIPE_CONNECT_ENABLED = 'false';
    expect(isStripeConnectEnabled()).toBe(false);
  });

  it('returns client-safe config payload', () => {
    process.env.ENABLE_DELIVERY = 'true';
    process.env.STRIPE_CONNECT_ENABLED = 'false';
    expect(getConfig()).toEqual({ enableDelivery: true, stripeConnectEnabled: false });
  });
});
