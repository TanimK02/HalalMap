import type { PendingPayment } from '../hooks/checkoutUtils';

type WebCheckoutPaymentProps = {
  pending: PendingPayment | null;
  onSuccess: () => Promise<void>;
  onCancel: () => void;
};

export function WebCheckoutPayment(_props: WebCheckoutPaymentProps) {
  return null;
}
