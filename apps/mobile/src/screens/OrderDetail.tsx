import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, ActivityIndicator } from 'react-native';
import { useRoute, type RouteProp } from '@react-navigation/native';
import { api } from '../api';
import { brand } from '../theme';

type OrderDetailData = {
  id: string;
  status: string;
  totalPrice: number | string;
  deliveryType: string;
  createdAt: string;
  restaurant: { name: string; address: string };
  items: { quantity: number; menuItem: { name: string }; priceAtOrder: number | string }[];
  deliveryAddress?: { street: string; city: string; postalCode: string } | null;
};

const STATUS_LABELS: Record<string, string> = {
  PENDING: 'Pending',
  ACCEPTED: 'Accepted',
  PREPARING: 'Preparing',
  READY: 'Ready',
  COMPLETED: 'Completed',
  CANCELLED: 'Cancelled',
};

export default function OrderDetail() {
  const route = useRoute<RouteProp<{ params: { orderId: string } }, 'params'>>();
  const orderId = route.params?.orderId;
  const [order, setOrder] = useState<OrderDetailData | null>(null);
  const [loading, setLoading] = useState(true);

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
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={brand.primary} />
      </View>
    );
  }
  if (!order) {
    return (
      <View style={styles.centered}>
        <Text style={styles.empty}>Order not found.</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <Text style={styles.restaurantName}>{order.restaurant?.name}</Text>
        <View style={styles.statusBadge}>
          <Text style={styles.statusText}>{STATUS_LABELS[order.status] ?? order.status}</Text>
        </View>
      </View>
      <Text style={styles.meta}>
        Order #{order.id.slice(-6)} · ${Number(order.totalPrice).toFixed(2)} · {order.deliveryType}
      </Text>
      <Text style={styles.meta}>{new Date(order.createdAt).toLocaleString()}</Text>
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
          <Text style={styles.rowPrice}>${Number(line.priceAtOrder).toFixed(2)}</Text>
        </View>
      ))}
      <View style={styles.totalRow}>
        <Text style={styles.totalLabel}>Total</Text>
        <Text style={styles.totalValue}>${Number(order.totalPrice).toFixed(2)}</Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: brand.background },
  content: { padding: 16, paddingBottom: 32 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  empty: { fontSize: 16, color: brand.textSecondary },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  restaurantName: { fontSize: 20, fontWeight: '700', color: brand.textPrimary },
  statusBadge: { backgroundColor: brand.primary, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
  statusText: { color: '#fff', fontWeight: '600', fontSize: 14 },
  meta: { fontSize: 14, color: brand.textSecondary, marginBottom: 4 },
  address: { fontSize: 14, color: brand.textSecondary, marginBottom: 20 },
  sectionTitle: { fontSize: 18, fontWeight: '600', color: brand.textPrimary, marginBottom: 12 },
  row: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#E5E7EB' },
  rowName: { fontSize: 16, color: brand.textPrimary },
  rowPrice: { fontSize: 16, color: brand.textSecondary },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 20, paddingTop: 12, borderTopWidth: 1, borderTopColor: '#E5E7EB' },
  totalLabel: { fontSize: 18, fontWeight: '600', color: brand.textPrimary },
  totalValue: { fontSize: 20, fontWeight: '700', color: brand.primary },
});
