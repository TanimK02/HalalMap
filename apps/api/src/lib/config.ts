/**
 * App-wide config derived from env. Used by routes to gate delivery, Stripe Connect, etc.,
 * and by GET /config for clients.
 */
export function isDeliveryEnabled(): boolean {
  return process.env.ENABLE_DELIVERY !== 'false';
}

export function isStripeConnectEnabled(): boolean {
  return process.env.STRIPE_CONNECT_ENABLED === 'true';
}

export function getConfig(): { enableDelivery: boolean; stripeConnectEnabled: boolean } {
  return {
    enableDelivery: isDeliveryEnabled(),
    stripeConnectEnabled: isStripeConnectEnabled(),
  };
}
