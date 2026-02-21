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
import { api } from '../api';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { brand } from '../theme';

export default function Cart() {
  const navigation = useNavigation();
  const { items, restaurantId, restaurantName, total, removeItem, clearCart } = useCart();
  const { token } = useAuth();
  const [deliveryType, setDeliveryType] = useState<'PICKUP' | 'DELIVERY'>('PICKUP');
  const [deliveryAddressId, setDeliveryAddressId] = useState<string | null>(null);
  const [addresses, setAddresses] = useState<{ id: string; label: string | null; street: string; city: string; postalCode: string; isDefault: boolean }[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingAddresses, setLoadingAddresses] = useState(false);

  React.useEffect(() => {
    if (deliveryType === 'DELIVERY' && token) {
      setLoadingAddresses(true);
      api
        .get('/users/addresses')
        .then((r) => {
          setAddresses(r.data);
          const defaultAddr = r.data.find((a: { isDefault: boolean }) => a.isDefault) ?? r.data[0];
          if (defaultAddr) setDeliveryAddressId(defaultAddr.id);
        })
        .catch(() => setAddresses([]))
        .finally(() => setLoadingAddresses(false));
    } else {
      setDeliveryAddressId(null);
    }
  }, [deliveryType, token]);

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
      const { data } = await api.post('/orders', payload);
      clearCart();
      (navigation as { navigate: (s: string, p: object) => void }).navigate('OrderDetail', {
        orderId: data.order.id,
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
          ) : addresses.length === 0 ? (
            <Text style={styles.hint}>Add an address in Profile.</Text>
          ) : (
            addresses.map((addr) => (
              <TouchableOpacity
                key={addr.id}
                style={[styles.addressRow, deliveryAddressId === addr.id && styles.addressRowActive]}
                onPress={() => setDeliveryAddressId(addr.id)}
              >
                <Text style={styles.addressText}>
                  {addr.label ?? addr.street}, {addr.city} {addr.postalCode}
                </Text>
                {addr.isDefault && (
                  <Text style={styles.defaultBadge}>Default</Text>
                )}
              </TouchableOpacity>
            ))
          )}
        </View>
      )}
      <View style={styles.totalRow}>
        <Text style={styles.totalLabel}>Total</Text>
        <Text style={styles.totalValue}>${total.toFixed(2)}</Text>
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
  hint: { fontSize: 14, color: brand.textSecondary },
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
