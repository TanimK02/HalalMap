import { useEffect, type ReactNode } from 'react';
import { Linking } from 'react-native';
import { StripeProvider, useStripe } from '@stripe/stripe-react-native';

const stripePublishableKey = process.env.EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY ?? '';

function StripeRedirectHandler({ children }: { children: ReactNode }) {
  const { handleURLCallback } = useStripe();
  useEffect(() => {
    const sub = Linking.addEventListener('url', (event) => {
      handleURLCallback(event.url);
    });
    return () => sub.remove();
  }, [handleURLCallback]);
  return <>{children}</>;
}

export default function StripeAppWrapper({ children }: { children: ReactNode }) {
  return (
    <StripeProvider publishableKey={stripePublishableKey}>
      <StripeRedirectHandler>{children}</StripeRedirectHandler>
    </StripeProvider>
  );
}
