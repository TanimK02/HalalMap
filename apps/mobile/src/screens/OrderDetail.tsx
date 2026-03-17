import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  Alert,
  Linking,
} from 'react-native';
import { useRoute, type RouteProp } from '@react-navigation/native';
import { api } from '../api';
import { brand } from '../theme';
import { ScreenHeader } from '../components/ScreenHeader';
import { OrderStatusModal } from '../components/OrderStatusModal';
import { getHoursLabel } from '../utils/businessHours';
import { getDirectionsUrl } from '../utils/directions';
import type { OrderDetailData } from '../types/order';
import { STATUS_LABELS } from '../types/order';

export default function OrderDetail() {
  const route = useRoute<RouteProp<{ params: { orderId: string } }, 'params'>>();
  const orderId = route.params?.orderId;
  const [order, setOrder] = useState<OrderDetailData | null>(null);
  const [loading, setLoading] = useState(true);
  const [statusModalVisible, setStatusModalVisible] = useState(false);

  useEffect(() => {
    if (!orderId) return;
    api
      .get<OrderDetailData>(`/orders/${orderId}`)
      .then((r) => setOrder(r.data))
      .catch(() => setOrder(null))
      .finally(() => setLoading(false));
  }, [orderId]);

  if (loading) {
    return (
      <View style={styles.wrapper}>
        <ScreenHeader title="Order" />
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={brand.primary} />
        </View>
      </View>
    );
  }
  if (!order) {
    return (
      <View style={styles.wrapper}>
        <ScreenHeader title="Order" />
        <View style={styles.centered}>
          <Text style={styles.empty}>Order not found.</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.wrapper}>
      <ScreenHeader title="Order" />
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <Text style={styles.restaurantName}>{order.restaurant?.name}</Text>
          <TouchableOpacity
            style={styles.statusBadge}
            onPress={() => setStatusModalVisible(true)}
            accessibilityLabel="View order status"
            accessibilityRole="button"
          >
            <Text style={styles.statusText}>
              {STATUS_LABELS[order.status] ?? order.status}
            </Text>
          </TouchableOpacity>
        </View>
        <Text style={styles.meta}>
          Order #{order.id.slice(-6)} · ${Number(order.totalPrice).toFixed(2)} ·{' '}
          {order.deliveryType}
        </Text>
        <Text style={styles.meta}>{new Date(order.createdAt).toLocaleString()}</Text>
        {order.deliveryType === 'PICKUP' &&
          order.restaurant &&
          (() => {
            const hours = getHoursLabel(order.restaurant.businessHours);
            if (!hours.primary && !hours.todayLine) return null;
            return (
              <View style={styles.hoursBlock}>
                {hours.primary ? (
                  <Text style={styles.hoursPrimary}>{hours.primary}</Text>
                ) : null}
                {hours.secondary ? (
                  <Text style={styles.hoursSecondary}>{hours.secondary}</Text>
                ) : null}
                {hours.todayLine ? (
                  <Text style={styles.hoursToday}>{hours.todayLine}</Text>
                ) : null}
              </View>
            );
          })()}
        {order.deliveryType === 'PICKUP' && order.restaurant?.address ? (
          <Text style={styles.restaurantAddress}>{order.restaurant.address}</Text>
        ) : null}
        {order.restaurant &&
          (() => {
            const r = order.restaurant;
            const hasPhone = r.phone != null && String(r.phone).trim() !== '';
            const directionsUrl = getDirectionsUrl(r.latitude, r.longitude, r.address);
            const isPickup = order.deliveryType === 'PICKUP';
            const showCall = hasPhone;
            const showDirections = isPickup && directionsUrl;
            if (!showCall && !showDirections) return null;
            return (
              <View style={styles.callDirectionsRow}>
                {showCall ? (
                  <TouchableOpacity
                    style={styles.callDirectionsBtn}
                    onPress={async () => {
                      try {
                        const url = `tel:${String(r.phone).trim()}`;
                        const can = await Linking.canOpenURL(url);
                        if (can) await Linking.openURL(url);
                        else Alert.alert('Unable to open', 'This device cannot place calls.');
                      } catch {
                        Alert.alert('Error', "Couldn't open phone dialer.");
                      }
                    }}
                    accessibilityLabel="Call restaurant"
                  >
                    <Text style={styles.callDirectionsBtnText}>Call</Text>
                  </TouchableOpacity>
                ) : null}
                {showDirections ? (
                  <TouchableOpacity
                    style={styles.callDirectionsBtn}
                    onPress={async () => {
                      try {
                        const can = await Linking.canOpenURL(directionsUrl);
                        if (can) await Linking.openURL(directionsUrl!);
                        else Alert.alert('Unable to open', "Couldn't open Maps.");
                      } catch {
                        Alert.alert('Error', "Couldn't open Maps.");
                      }
                    }}
                    accessibilityLabel="Open directions in Maps"
                  >
                    <Text style={styles.callDirectionsBtnText}>Directions</Text>
                  </TouchableOpacity>
                ) : null}
              </View>
            );
          })()}
        {order.deliveryAddress && (
          <Text style={styles.address}>
            Delivery: {order.deliveryAddress.street}, {order.deliveryAddress.city}{' '}
            {order.deliveryAddress.postalCode}
          </Text>
        )}
        <Text style={styles.sectionTitle}>Items</Text>
        {(order.items ?? []).map((line, i) => (
          <View key={i} style={styles.row}>
            <Text style={styles.rowName}>
              {line.quantity}x {line.menuItem?.name}
            </Text>
            <Text style={styles.rowPrice}>
              ${Number(line.priceAtOrder).toFixed(2)}
            </Text>
          </View>
        ))}
        {((order.feeCents ?? 0) > 0 || (order.taxCents ?? 0) > 0) && (
          <>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Subtotal</Text>
              <Text style={styles.summaryValue}>
                ${(
                  Number(order.totalPrice) -
                  (order.feeCents ?? 0) / 100 -
                  (order.taxCents ?? 0) / 100
                ).toFixed(2)}
              </Text>
            </View>
            {(order.feeCents ?? 0) > 0 && (
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>
                  {order.deliveryType === 'PICKUP' ? 'Pickup fee' : 'Delivery fee'}
                </Text>
                <Text style={styles.summaryValue}>
                  ${((order.feeCents ?? 0) / 100).toFixed(2)}
                </Text>
              </View>
            )}
            {(order.taxCents ?? 0) > 0 && (
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Tax</Text>
                <Text style={styles.summaryValue}>
                  ${((order.taxCents ?? 0) / 100).toFixed(2)}
                </Text>
              </View>
            )}
          </>
        )}
        <View style={styles.totalRow}>
          <Text style={styles.totalLabel}>Total</Text>
          <Text style={styles.totalValue}>${Number(order.totalPrice).toFixed(2)}</Text>
        </View>
      </ScrollView>

      <OrderStatusModal
        visible={statusModalVisible}
        onClose={() => setStatusModalVisible(false)}
        status={order.status}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { flex: 1 },
  container: { flex: 1, backgroundColor: brand.background },
  content: { padding: 16, paddingBottom: 32 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  empty: { fontSize: 16, color: brand.textSecondary },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  restaurantName: { fontSize: 20, fontWeight: '700', color: brand.textPrimary },
  statusBadge: {
    backgroundColor: brand.primary,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  statusText: { color: '#fff', fontWeight: '600', fontSize: 14 },
  meta: { fontSize: 14, color: brand.textSecondary, marginBottom: 4 },
  hoursBlock: { marginBottom: 12 },
  hoursPrimary: { fontSize: 14, fontWeight: '600', color: brand.primary },
  hoursSecondary: { fontSize: 14, color: brand.textSecondary },
  hoursToday: { fontSize: 14, color: brand.textSecondary, marginTop: 2 },
  restaurantAddress: { fontSize: 14, color: brand.textSecondary, marginBottom: 8 },
  callDirectionsRow: { flexDirection: 'row', gap: 12, marginBottom: 20 },
  callDirectionsBtn: {
    backgroundColor: brand.primary,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
  },
  callDirectionsBtnText: { color: '#fff', fontWeight: '600', fontSize: 14 },
  address: { fontSize: 14, color: brand.textSecondary, marginBottom: 20 },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: brand.textPrimary,
    marginBottom: 12,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  rowName: { fontSize: 16, color: brand.textPrimary },
  rowPrice: { fontSize: 16, color: brand.textSecondary },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 },
  summaryLabel: { fontSize: 14, color: brand.textSecondary },
  summaryValue: { fontSize: 14, color: brand.textPrimary },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  totalLabel: { fontSize: 18, fontWeight: '600', color: brand.textPrimary },
  totalValue: { fontSize: 20, fontWeight: '700', color: brand.primary },
});
