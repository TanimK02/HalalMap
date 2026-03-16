import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { api } from '../api';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { useConfig } from '../context/ConfigContext';
import { useCheckout } from '../hooks/useCheckout';
import { brand } from '../theme';
import { DeliveryAddressSection } from '../components/DeliveryAddressSection';
import type { Address } from '../types/address';
import type { FeeStructure, RestaurantFees } from '../types/fees';
import { computeFeeCents } from '../utils/fees';

export default function Cart() {
  const navigation = useNavigation();
  const { items, restaurantId, restaurantName, total, removeItem } = useCart();
  const { token } = useAuth();
  const { enableDelivery } = useConfig();
  const [deliveryType, setDeliveryType] = useState<'PICKUP' | 'DELIVERY'>('PICKUP');
  const [deliveryAddressId, setDeliveryAddressId] = useState<string | null>(null);
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [restaurantFees, setRestaurantFees] = useState<RestaurantFees | null>(null);
  const [loadingAddresses, setLoadingAddresses] = useState(false);
  const [showAddAddressForm, setShowAddAddressForm] = useState(false);
  const [showAddressList, setShowAddressList] = useState(false);

  const { handleCheckout, loading: checkoutLoading } = useCheckout(
    deliveryType,
    deliveryAddressId
  );

  const subtotal = total;
  const subtotalCents = Math.round(subtotal * 100);
  const feeStructure =
    restaurantFees && (deliveryType === 'PICKUP' || !enableDelivery)
      ? restaurantFees.pickupFee
      : restaurantFees?.deliveryFee;
  const feeCents = feeStructure ? computeFeeCents(subtotalCents, feeStructure) : 0;
  const totalWithFee = (subtotalCents + feeCents) / 100;

  useEffect(() => {
    if (restaurantId && items.length > 0) {
      api
        .get<{ pickupFee: FeeStructure; deliveryFee: FeeStructure }>(
          `/restaurants/${restaurantId}`
        )
        .then((r) =>
          setRestaurantFees({ pickupFee: r.data.pickupFee, deliveryFee: r.data.deliveryFee })
        )
        .catch(() => setRestaurantFees(null));
    } else {
      setRestaurantFees(null);
    }
  }, [restaurantId, items.length]);

  useEffect(() => {
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

  useEffect(() => {
    if (!enableDelivery) setDeliveryType('PICKUP');
  }, [enableDelivery]);

  if (items.length === 0) {
    return (
      <View style={styles.centered}>
        <Text style={styles.empty}>Your cart is empty.</Text>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => {
            const nav = navigation as {
              getParent?: () => { navigate: (a: string, b?: object) => void } | null;
              goBack: () => void;
            };
            const parent = nav.getParent?.();
            if (parent) {
              (parent as { navigate: (a: string, b?: object) => void }).navigate('Main', {
                screen: 'HomeTab',
              });
            } else {
              nav.goBack();
            }
          }}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
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
      {enableDelivery && (
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
      )}
      {enableDelivery && deliveryType === 'DELIVERY' && (
        <DeliveryAddressSection
          addresses={addresses}
          deliveryAddressId={deliveryAddressId}
          onSelectAddress={setDeliveryAddressId}
          onDone={() => setShowAddressList(false)}
          showAddForm={showAddAddressForm}
          showList={showAddressList}
          onShowAddForm={setShowAddAddressForm}
          onShowList={setShowAddressList}
          loading={loadingAddresses}
          onSaved={(addr) => {
            setAddresses((prev) => [...prev, addr]);
            setDeliveryAddressId(addr.id);
          }}
          onCancel={() => setShowAddAddressForm(false)}
        />
      )}
      {feeCents > 0 && (
        <>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Subtotal</Text>
            <Text style={styles.summaryValue}>${subtotal.toFixed(2)}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>
              {deliveryType === 'PICKUP' || !enableDelivery ? 'Pickup fee' : 'Delivery fee'}
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
        style={[styles.checkoutBtn, checkoutLoading && styles.checkoutBtnDisabled]}
        onPress={handleCheckout}
        disabled={
          checkoutLoading || (enableDelivery && deliveryType === 'DELIVERY' && !deliveryAddressId)
        }
      >
        {checkoutLoading ? (
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
  restaurantName: {
    fontSize: 18,
    fontWeight: '600',
    color: brand.textPrimary,
    marginBottom: 16,
  },
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
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: brand.textPrimary,
    marginBottom: 10,
  },
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
