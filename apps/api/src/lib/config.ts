/**
 * App-wide config derived from env. Used by routes to gate delivery and by GET /config for clients.
 */
export function isDeliveryEnabled(): boolean {
  return process.env.ENABLE_DELIVERY !== 'false';
}

export function getConfig(): { enableDelivery: boolean } {
  return { enableDelivery: isDeliveryEnabled() };
}
