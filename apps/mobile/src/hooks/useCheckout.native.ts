import { useState } from 'react';
import { useNavigation } from '@react-navigation/native';
import axios from 'axios';
import { useStripe } from '../stripe/useStripe';
import { Alert } from 'react-native';
import { api } from '../api';
import { useCart } from '../context/CartContext';
import { useConfig } from '../context/ConfigContext';
import { finalizeOrderFromPaymentIntent } from './checkoutUtils';

export function useCheckout(
  deliveryType: 'PICKUP' | 'DELIVERY',
  deliveryAddressId: string | null
) {
  const navigation = useNavigation();
  const { initPaymentSheet, presentPaymentSheet } = useStripe();
  const { items, restaurantId, restaurantName, total, clearCart } = useCart();
  const { enableDelivery } = useConfig();
  const [loading, setLoading] = useState(false);

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

      await finalizeOrderFromPaymentIntent(paymentIntentId, clearCart, navigateToOrder);
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

  return {
    handleCheckout,
    loading,
    pendingPayment: null,
    onPaymentSuccess: async () => {},
    onPaymentCancel: () => {},
  };
}
