import { useState } from 'react';
import { useNavigation } from '@react-navigation/native';
import axios from 'axios';
import { useStripe } from '@stripe/stripe-react-native';
import { Alert } from 'react-native';
import { api } from '../api';
import { useCart } from '../context/CartContext';
import { useConfig } from '../context/ConfigContext';

export function useCheckout(
  deliveryType: 'PICKUP' | 'DELIVERY',
  deliveryAddressId: string | null
) {
  const navigation = useNavigation();
  const { initPaymentSheet, presentPaymentSheet } = useStripe();
  const { items, restaurantId, restaurantName, total, clearCart } = useCart();
  const { enableDelivery } = useConfig();
  const [loading, setLoading] = useState(false);

  async function fetchOrderByPaymentIntentId(
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
        (navigation as { navigate: (s: string, p: object) => void }).navigate('OrderDetail', {
          orderId: data.order.id,
        });
        setLoading(false);
        return;
      }

      const { clientSecret, paymentIntentId } = data;

      const { error: initError } = await initPaymentSheet({
        paymentIntentClientSecret: clientSecret,
        merchantDisplayName: restaurantName ?? 'Halal Map',
        returnURL: 'halalmap://stripe-redirect',
      });
      if (initError) {
        Alert.alert('Payment setup failed', initError.message ?? 'Could not open payment form.');
        setLoading(false);
        return;
      }

      const { error: presentError } = await presentPaymentSheet();
      if (presentError) {
        if (presentError.code !== 'Canceled') {
          Alert.alert('Payment failed', presentError.message ?? 'Payment was not completed.');
        }
        setLoading(false);
        return;
      }

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
        setLoading(false);
        return;
      }
      clearCart();
      (navigation as { navigate: (s: string, p: object) => void }).navigate('OrderDetail', {
        orderId: order.id,
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

  return { handleCheckout, loading };
}
