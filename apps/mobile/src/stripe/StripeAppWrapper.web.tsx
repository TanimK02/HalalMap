import type { ReactNode } from 'react';

/** Web checkout uses Stripe.js Payment Element via WebCheckoutPayment. */
export default function StripeAppWrapper({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
