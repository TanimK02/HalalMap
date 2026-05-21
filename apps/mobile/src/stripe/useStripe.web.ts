/** No-op Stripe hooks for Expo web preview (payments require iOS/Android). */
export function useStripe() {
  return {
    initPaymentSheet: async () => ({
      error: { message: 'Payments are not available in the web preview. Use the iOS or Android app.' },
    }),
    presentPaymentSheet: async () => ({ error: { code: 'Canceled' as const } }),
    handleURLCallback: async () => false,
  };
}
