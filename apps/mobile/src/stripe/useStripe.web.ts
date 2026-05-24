/** Legacy stub — web checkout uses Stripe.js via WebCheckoutPayment instead. */
export function useStripe() {
  return {
    initPaymentSheet: async () => ({
      error: { message: 'Payments are not available in the web preview. Use the iOS or Android app.' },
    }),
    presentPaymentSheet: async () => ({ error: { code: 'Canceled' as const } }),
    handleURLCallback: async () => false,
  };
}
