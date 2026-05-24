import { useState } from 'react';
import { useNavigation } from '@react-navigation/native';
import axios from 'axios';
import { Alert } from 'react-native';
import { api } from '../api';
import { useCart } from '../context/CartContext';
import { useConfig } from '../context/ConfigContext';
import { finalizeOrderFromPaymentIntent, type PendingPayment } from './checkoutUtils';

const stripePublishableKey = process.env.EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY ?? '';

export function useCheckout(
  deliveryType: 'PICKUP' | 'DELIVERY',
  deliveryAddressId: string | null
) {
  const navigation = useNavigation();
  const { items, restaurantId, restaurantName, clearCart } = useCart();
  const { enableDelivery } = useConfig();
  const [loading, setLoading] = useState(false);
  const [pendingPayment, setPendingPayment] = useState<PendingPayment | null>(null);

  function navigateToOrder(orderId: string) {
    (navigation as { navigate: (s: string, p: object) => void }).navigate('OrderDetail', {
      orderId,
    });
  }

  async function handleCheckout() {
    if (!restaurantId || items.length === 0) return;
    if (deliveryType === 'DELIVERY' && !enableDelivery) {
      Alert.alert('Delivery unavailable', 'Delivery is currently not available. Please choose pickup.');
      return;
    }
    if (deliveryType === 'DELIVERY' && !deliveryAddressId) {
      Alert.alert('Address required', 'Please select a delivery address.');
      return;
    }
    setLoading(true);
    try {
      const payload = {
        restaurantId,
        deliveryType,
        deliveryAddressId: deliveryType === 'DELIVERY' ? deliveryAddressId : undefined,
        items: items.map((i) => ({ menuItemId: i.menuItemId, quantity: i.quantity })),
      };
      const { data } = await api.post<
        | { order: { id: string }; clientSecret: null }
        | { clientSecret: string; paymentIntentId: string }
      >('/orders', payload);

      if ('order' in data && data.clientSecret === null) {
        clearCart();
        navigateToOrder(data.order.id);
        return;
      }

      if (!stripePublishableKey) {
        Alert.alert(
          'Payment unavailable',
          'Stripe is not configured for web checkout. Set EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY.'
        );
        return;
      }

      const { clientSecret, paymentIntentId } = data;
      setPendingPayment({
        clientSecret,
        paymentIntentId,
        merchantDisplayName: restaurantName ?? 'Halal Map',
      });
    } catch (err) {
      const msg =
        axios.isAxiosError(err) && err.response?.data?.error
          ? err.response.data.error
          : 'Checkout failed';
      Alert.alert('Error', String(msg));
    } finally {
      setLoading(false);
    }
  }

  async function onPaymentSuccess() {
    if (!pendingPayment) return;
    const { paymentIntentId } = pendingPayment;
    setPendingPayment(null);
    setLoading(true);
    try {
      await finalizeOrderFromPaymentIntent(paymentIntentId, clearCart, navigateToOrder);
    } finally {
      setLoading(false);
    }
  }

  function onPaymentCancel() {
    setPendingPayment(null);
  }

  return {
    handleCheckout,
    loading,
    pendingPayment,
    onPaymentSuccess,
    onPaymentCancel,
  };
}
