import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { api } from '../api';
import { brand } from '../theme';

type Order = {
  id: string;
  status: string;
  totalPrice: number | string;
  deliveryType: string;
  createdAt: string;
  restaurant: { id: string; name: string; address: string };
  items: { quantity: number; menuItem: { name: string }; priceAtOrder: number | string }[];
};

const STATUS_LABELS: Record<string, string> = {
  PENDING: 'Pending',
  ACCEPTED: 'Accepted',
  PREPARING: 'Preparing',
  READY: 'Ready',
  COMPLETED: 'Completed',
  CANCELLED: 'Cancelled',
};

export default function Orders() {
  const navigation = useNavigation();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get<Order[]>('/orders')
      .then((r) => setOrders(r.data))
      .catch(() => setOrders([]))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={brand.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={orders}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.card}
            onPress={() =>
              (navigation as { navigate: (s: string, p: object) => void }).navigate('OrderDetail', {
                orderId: item.id,
              })
            }
            activeOpacity={0.7}
          >
            <View style={styles.cardHeader}>
              <Text style={styles.cardTitle}>{item.restaurant?.name ?? 'Restaurant'}</Text>
              <View style={styles.statusBadge}>
                <Text style={styles.statusText}>
                  {STATUS_LABELS[item.status] ?? item.status}
                </Text>
              </View>
            </View>
            <Text style={styles.cardMeta}>
              ${Number(item.totalPrice).toFixed(2)} · {item.deliveryType} ·{' '}
              {new Date(item.createdAt).toLocaleDateString()}
            </Text>
            <TouchableOpacity
              style={styles.reorderBtn}
              onPress={() =>
                (navigation as { navigate: (s: string, p: object) => void }).navigate(
                  'RestaurantDetail',
                  { restaurantId: item.restaurant?.id, name: item.restaurant?.name }
                )
              }
            >
              <Text style={styles.reorderBtnText}>Re-order</Text>
            </TouchableOpacity>
          </TouchableOpacity>
        )}
        ListEmptyComponent={
          <View style={styles.centered}>
            <Text style={styles.empty}>No orders yet.</Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: brand.background },
  list: { padding: 16, paddingBottom: 32 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  empty: { fontSize: 16, color: brand.textSecondary },
  card: {
    backgroundColor: brand.surface,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  cardTitle: { fontSize: 18, fontWeight: '600', color: brand.textPrimary },
  statusBadge: { backgroundColor: '#E5E7EB', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  statusText: { fontSize: 13, color: brand.textPrimary },
  cardMeta: { fontSize: 14, color: brand.textSecondary, marginBottom: 10 },
  reorderBtn: { alignSelf: 'flex-start' },
  reorderBtnText: { color: brand.primary, fontWeight: '600', fontSize: 14 },
});
