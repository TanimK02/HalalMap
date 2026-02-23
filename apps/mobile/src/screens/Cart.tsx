import React, { useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  ScrollView,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import axios from 'axios';
import { useStripe } from '@stripe/stripe-react-native';
import { api } from '../api';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { brand } from '../theme';
import { AddressForm } from '../components/AddressForm';
import type { Address } from '../types/address';

type FeeStructure =
  | { type: 'flat'; valueCents: number }
  | { type: 'percent'; valuePercent: number };

type RestaurantFees = {
  pickupFee: FeeStructure;
  deliveryFee: FeeStructure;
};

function computeFeeCents(subtotalCents: number, fee: FeeStructure): number {
  if (fee.type === 'flat') return fee.valueCents;
  return Math.round((subtotalCents * fee.valuePercent) / 100);
}

export default function Cart() {
  const navigation = useNavigation();
  const { initPaymentSheet, presentPaymentSheet } = useStripe();
  const { items, restaurantId, restaurantName, total, removeItem, clearCart } = useCart();
  const { token } = useAuth();
  const [deliveryType, setDeliveryType] = useState<'PICKUP' | 'DELIVERY'>('PICKUP');
  const [deliveryAddressId, setDeliveryAddressId] = useState<string | null>(null);
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [restaurantFees, setRestaurantFees] = useState<RestaurantFees | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingAddresses, setLoadingAddresses] = useState(false);
  const [showAddAddressForm, setShowAddAddressForm] = useState(false);
  const [showAddressList, setShowAddressList] = useState(false);

  const subtotal = total;
  const subtotalCents = Math.round(subtotal * 100);
  const feeStructure =
    restaurantFees && deliveryType === 'PICKUP'
      ? restaurantFees.pickupFee
      : restaurantFees?.deliveryFee;
  const feeCents = feeStructure ? computeFeeCents(subtotalCents, feeStructure) : 0;
  const totalWithFee = (subtotalCents + feeCents) / 100;

  React.useEffect(() => {
    if (restaurantId && items.length > 0) {
      api
        .get<{ pickupFee: FeeStructure; deliveryFee: FeeStructure }>(`/restaurants/${restaurantId}`)
        .then((r) => setRestaurantFees({ pickupFee: r.data.pickupFee, deliveryFee: r.data.deliveryFee }))
        .catch(() => setRestaurantFees(null));
    } else {
      setRestaurantFees(null);
    }
  }, [restaurantId, items.length]);

  React.useEffect(() => {
    if (deliveryType === 'DELIVERY' && token) {
      setLoadingAddresses(true);
      api
        .get<Address[]>('/users/addresses')
        .then((r) => {
          setAddresses(r.data);
          const defaultAddr = r.data.find((a) => a.isDefault) ?? r.data[0];
          if (defaultAddr) setDeliveryAddressId(defaultAddr.id);
        })
        .catch(() => setAddresses([]))
        .finally(() => setLoadingAddresses(false));
    } else {
      setDeliveryAddressId(null);
      setShowAddressList(false);
      setShowAddAddressForm(false);
    }
  }, [deliveryType, token]);

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

      // Create order from payment intent (works when webhook has not run, e.g. local dev)
      let order: { id: string } | null = null;
      try {
        const { data: orderData } = await api.post<{ id: string }>('/orders/from-payment-intent', {
          paymentIntentId,
        });
        order = orderData;
      } catch {
        // Webhook may have created it; fall back to polling
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

  if (items.length === 0) {
    return (
      <View style={styles.centered}>
        <Text style={styles.empty}>Your cart is empty.</Text>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => (navigation as { goBack: () => void }).goBack()}
        >
          <Text style={styles.backBtnText}>Browse restaurants</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.restaurantName}>{restaurantName}</Text>
      <FlatList
        data={items}
        keyExtractor={(item) => item.menuItemId}
        scrollEnabled={false}
        renderItem={({ item }) => (
          <View style={styles.row}>
            <View style={styles.rowInfo}>
              <Text style={styles.rowName}>{item.name}</Text>
              <Text style={styles.rowMeta}>
                ${Number(item.price).toFixed(2)} × {item.quantity}
              </Text>
            </View>
            <TouchableOpacity
              onPress={() => removeItem(item.menuItemId, 1)}
              style={styles.removeBtn}
            >
              <Text style={styles.removeBtnText}>−</Text>
            </TouchableOpacity>
          </View>
        )}
      />
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Delivery type</Text>
        <View style={styles.radioRow}>
          <TouchableOpacity
            style={[styles.radio, deliveryType === 'PICKUP' && styles.radioActive]}
            onPress={() => setDeliveryType('PICKUP')}
          >
            <Text style={deliveryType === 'PICKUP' ? styles.radioTextActive : styles.radioText}>
              Pickup
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.radio, deliveryType === 'DELIVERY' && styles.radioActive]}
            onPress={() => setDeliveryType('DELIVERY')}
          >
            <Text style={deliveryType === 'DELIVERY' ? styles.radioTextActive : styles.radioText}>
              Delivery
            </Text>
          </TouchableOpacity>
        </View>
      </View>
      {deliveryType === 'DELIVERY' && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Delivery address</Text>
          {loadingAddresses ? (
            <ActivityIndicator color={brand.primary} />
          ) : showAddAddressForm ? (
            <AddressForm
              onSaved={(addr) => {
                setAddresses((prev) => [...prev, addr]);
                setDeliveryAddressId(addr.id);
                setShowAddAddressForm(false);
                setShowAddressList(false);
              }}
              onCancel={() => setShowAddAddressForm(false)}
              submitLabel="Use this address"
            />
          ) : addresses.length === 0 ? (
            <TouchableOpacity
              style={styles.addAddressBtn}
              onPress={() => setShowAddAddressForm(true)}
            >
              <Text style={styles.addAddressBtnText}>Add delivery address</Text>
            </TouchableOpacity>
          ) : showAddressList ? (
            <>
              {addresses.map((addr) => (
                <TouchableOpacity
                  key={addr.id}
                  style={[styles.addressRow, deliveryAddressId === addr.id && styles.addressRowActive]}
                  onPress={() => {
                    setDeliveryAddressId(addr.id);
                    setShowAddressList(false);
                  }}
                >
                  <Text style={styles.addressText}>
                    {addr.label ?? addr.street}, {addr.city} {addr.postalCode}
                  </Text>
                  {addr.isDefault && (
                    <Text style={styles.defaultBadge}>Default</Text>
                  )}
                </TouchableOpacity>
              ))}
              <TouchableOpacity
                style={styles.addNewAddressBtn}
                onPress={() => setShowAddAddressForm(true)}
              >
                <Text style={styles.addNewAddressBtnText}>+ Add new address</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.doneBtn}
                onPress={() => setShowAddressList(false)}
              >
                <Text style={styles.doneBtnText}>Done</Text>
              </TouchableOpacity>
            </>
          ) : (
            <>
              {(() => {
                const selected = addresses.find((a) => a.id === deliveryAddressId) ?? addresses[0];
                return selected ? (
                  <View style={styles.addressRow}>
                    <Text style={styles.addressText}>
                      {selected.label ?? selected.street}, {selected.city} {selected.postalCode}
                    </Text>
                    {selected.isDefault && (
                      <Text style={styles.defaultBadge}>Default</Text>
                    )}
                  </View>
                ) : null;
              })()}
              <TouchableOpacity
                style={styles.changeAddressBtn}
                onPress={() => setShowAddressList(true)}
              >
                <Text style={styles.changeAddressBtnText}>Change address</Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      )}
      {feeCents > 0 && (
        <>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Subtotal</Text>
            <Text style={styles.summaryValue}>${subtotal.toFixed(2)}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>
              {deliveryType === 'PICKUP' ? 'Pickup fee' : 'Delivery fee'}
            </Text>
            <Text style={styles.summaryValue}>${(feeCents / 100).toFixed(2)}</Text>
          </View>
        </>
      )}
      <View style={styles.totalRow}>
        <Text style={styles.totalLabel}>Total</Text>
        <Text style={styles.totalValue}>${totalWithFee.toFixed(2)}</Text>
      </View>
      <TouchableOpacity
        style={[styles.checkoutBtn, loading && styles.checkoutBtnDisabled]}
        onPress={handleCheckout}
        disabled={loading || (deliveryType === 'DELIVERY' && !deliveryAddressId)}
      >
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.checkoutBtnText}>Checkout</Text>
        )}
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: brand.background },
  content: { padding: 16, paddingBottom: 32 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  empty: { fontSize: 16, color: brand.textSecondary, marginBottom: 16 },
  backBtn: { padding: 12, backgroundColor: brand.primary, borderRadius: 8 },
  backBtnText: { color: '#fff', fontWeight: '600' },
  restaurantName: { fontSize: 18, fontWeight: '600', color: brand.textPrimary, marginBottom: 16 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: brand.surface,
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
  },
  rowInfo: { flex: 1 },
  rowName: { fontSize: 16, fontWeight: '600', color: brand.textPrimary },
  rowMeta: { fontSize: 14, color: brand.textSecondary, marginTop: 4 },
  removeBtn: { padding: 8 },
  removeBtnText: { fontSize: 18, color: brand.primary, fontWeight: '700' },
  section: { marginTop: 20 },
  sectionTitle: { fontSize: 16, fontWeight: '600', color: brand.textPrimary, marginBottom: 10 },
  radioRow: { flexDirection: 'row', gap: 12 },
  radio: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#d1d5db',
  },
  radioActive: { backgroundColor: brand.primary, borderColor: brand.primary },
  radioText: { fontSize: 14, color: brand.textPrimary },
  radioTextActive: { fontSize: 14, color: '#fff', fontWeight: '600' },
  addAddressBtn: {
    padding: 12,
    borderWidth: 1,
    borderColor: brand.primary,
    borderRadius: 8,
    alignItems: 'center',
  },
  addAddressBtnText: { color: brand.primary, fontWeight: '600' },
  addNewAddressBtn: {
    padding: 12,
    borderWidth: 1,
    borderColor: brand.primary,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 8,
  },
  addNewAddressBtnText: { color: brand.primary, fontWeight: '600' },
  doneBtn: {
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#d1d5db',
    alignItems: 'center',
  },
  doneBtnText: { color: brand.textPrimary, fontWeight: '600' },
  changeAddressBtn: {
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#d1d5db',
    alignItems: 'center',
    marginTop: 8,
  },
  changeAddressBtnText: { color: brand.textPrimary, fontWeight: '600' },
  addressRow: {
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#d1d5db',
    marginBottom: 8,
  },
  addressRowActive: { borderColor: brand.primary, backgroundColor: '#f0fdf4' },
  addressText: { fontSize: 14, color: brand.textPrimary },
  defaultBadge: { fontSize: 12, color: brand.primary, marginTop: 4 },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
  },
  summaryLabel: { fontSize: 14, color: brand.textSecondary },
  summaryValue: { fontSize: 14, color: brand.textPrimary },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 24,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  totalLabel: { fontSize: 18, fontWeight: '600', color: brand.textPrimary },
  totalValue: { fontSize: 20, fontWeight: '700', color: brand.primary },
  checkoutBtn: {
    backgroundColor: brand.accent,
    borderRadius: 8,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 16,
  },
  checkoutBtnDisabled: { opacity: 0.7 },
  checkoutBtnText: { color: '#fff', fontSize: 18, fontWeight: '600' },
});
