import type { ReactNode } from 'react';

/** Web preview: Stripe React Native is native-only; checkout shows an alert via useStripe web stub. */
export default function StripeAppWrapper({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
