import axios from 'axios';
import { Alert } from 'react-native';
import { api } from '../api';

export type PendingPayment = {
  clientSecret: string;
  paymentIntentId: string;
  merchantDisplayName: string;
};

export async function fetchOrderByPaymentIntentId(
  paymentIntentId: string,
  retries = 2
): Promise<{ id: string } | null> {
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const { data } = await api.get<{ id: string }>(
        `/orders/by-payment-intent/${paymentIntentId}`
      );
      return data;
    } catch (e) {
      if (axios.isAxiosError(e) && e.response?.status === 404 && attempt < retries) {
        await new Promise((r) => setTimeout(r, 800));
        continue;
      }
      return null;
    }
  }
  return null;
}

export async function finalizeOrderFromPaymentIntent(
  paymentIntentId: string,
  clearCart: () => void,
  navigateToOrder: (orderId: string) => void
): Promise<void> {
  let order: { id: string } | null = null;
  try {
    const { data: orderData } = await api.post<{ id: string }>('/orders/from-payment-intent', {
      paymentIntentId,
    });
    order = orderData;
  } catch {
    order = await fetchOrderByPaymentIntentId(paymentIntentId);
  }
  if (!order) {
    Alert.alert(
      'Order is being created',
      'Check My Orders in a moment. Your payment was successful.'
    );
    clearCart();
    return;
  }
  clearCart();
  navigateToOrder(order.id);
}
