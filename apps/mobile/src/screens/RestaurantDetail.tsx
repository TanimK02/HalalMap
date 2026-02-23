import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import { api } from '../api';
import { useCart } from '../context/CartContext';
import { ViewCartBar } from '../components/ViewCartBar';
import { brand, halalBadgeStyles, HALAL_LABELS } from '../theme';

type MenuCategory = {
  id: string;
  name: string;
  sortOrder: number;
  items: {
    id: string;
    name: string;
    description: string | null;
    price: number;
    imageUrl: string | null;
    isAvailable: boolean;
    availableForPickup?: boolean;
    availableForDelivery?: boolean;
  }[];
};

type RestaurantDetailData = {
  id: string;
  name: string;
  description: string | null;
  address: string;
  halalStatuses: string[];
  menuCategories: MenuCategory[];
};

type RouteParams = { restaurantId: string; name: string };

export default function RestaurantDetail() {
  const navigation = useNavigation();
  const route = useRoute<RouteProp<{ params: RouteParams }, 'params'>>();
  const { restaurantId, name: restaurantName } = route.params ?? { restaurantId: '', name: '' };
  const { addItem, items, restaurantId: cartRestaurantId } = useCart();
  const [data, setData] = useState<RestaurantDetailData | null>(null);
  const [loading, setLoading] = useState(true);
  const [deliveryType, setDeliveryType] = useState<'PICKUP' | 'DELIVERY'>('PICKUP');

  useEffect(() => {
    if (!restaurantId) return;
    api
      .get<RestaurantDetailData>(`/restaurants/${restaurantId}`)
      .then((r) => setData(r.data))
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, [restaurantId]);

  function canAddForDeliveryType(
    item: { availableForPickup?: boolean; availableForDelivery?: boolean }
  ): boolean {
    const pickup = item.availableForPickup !== false;
    const delivery = item.availableForDelivery !== false;
    return deliveryType === 'PICKUP' ? pickup : delivery;
  }

  function handleAddItem(
    item: {
      id: string;
      name: string;
      price: number;
      isAvailable: boolean;
      availableForPickup?: boolean;
      availableForDelivery?: boolean;
    },
    categoryName: string
  ) {
    if (!data) return;
    if (!item.isAvailable) return;
    if (!canAddForDeliveryType(item)) return;
    if (cartRestaurantId && cartRestaurantId !== data.id) {
      Alert.alert(
        'Different restaurant',
        'Your cart has items from another restaurant. Adding this will replace the cart. Continue?',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Replace cart',
            onPress: () => {
              addItem(data.id, data.name, item.id, item.name, Number(item.price), 1);
            },
          },
        ]
      );
      return;
    }
    addItem(data.id, data.name, item.id, item.name, Number(item.price), 1);
  }

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={brand.primary} />
      </View>
    );
  }
  if (!data) {
    return (
      <View style={styles.centered}>
        <Text style={styles.empty}>Restaurant not found.</Text>
      </View>
    );
  }

  const badgeStyle = (status: string) => halalBadgeStyles[status] ?? { bg: '#E5E7EB', text: '#1F2933' };

  return (
    <View style={styles.wrapper}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={[styles.content, items.length > 0 && styles.contentWithBar]}
      >
        <View style={styles.header}>
          <Text style={styles.title}>{data.name}</Text>
          <View style={styles.badgeRow}>
            {(data.halalStatuses ?? []).map((status) => {
              const style = badgeStyle(status);
              return (
                <View key={status} style={[styles.badge, { backgroundColor: style.bg }]}>
                  <Text style={[styles.badgeText, { color: style.text }]}>
                    {HALAL_LABELS[status] ?? status}
                  </Text>
                </View>
              );
            })}
          </View>
        </View>
        {data.description ? (
          <Text style={styles.desc}>{data.description}</Text>
        ) : null}
        <Text style={styles.address}>{data.address}</Text>

        <View style={styles.deliveryTypeRow}>
          <Text style={styles.deliveryTypeLabel}>Order for:</Text>
          <View style={styles.deliveryTypeButtons}>
            <TouchableOpacity
              style={[styles.deliveryTypeBtn, deliveryType === 'PICKUP' && styles.deliveryTypeBtnActive]}
              onPress={() => setDeliveryType('PICKUP')}
            >
              <Text style={[styles.deliveryTypeBtnText, deliveryType === 'PICKUP' && styles.deliveryTypeBtnTextActive]}>
                Pickup
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.deliveryTypeBtn, deliveryType === 'DELIVERY' && styles.deliveryTypeBtnActive]}
              onPress={() => setDeliveryType('DELIVERY')}
            >
              <Text style={[styles.deliveryTypeBtnText, deliveryType === 'DELIVERY' && styles.deliveryTypeBtnTextActive]}>
                Delivery
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {data.menuCategories.map((cat) => (
          <View key={cat.id} style={styles.section}>
            <Text style={styles.sectionTitle}>{cat.name}</Text>
            {(cat.items ?? []).map((item) => {
              const available = item.isAvailable && canAddForDeliveryType(item);
              const pickupOnly = item.availableForPickup && item.availableForDelivery === false;
              const deliveryOnly = item.availableForDelivery && item.availableForPickup === false;
              const availabilityNote = pickupOnly ? 'Pickup only' : deliveryOnly ? 'Delivery only' : null;
              return (
                <View key={item.id} style={styles.itemRow}>
                  <View style={styles.itemInfo}>
                    <Text style={styles.itemName}>{item.name}</Text>
                    {item.description ? (
                      <Text style={styles.itemDesc} numberOfLines={2}>
                        {item.description}
                      </Text>
                    ) : null}
                    {availabilityNote ? (
                      <Text style={styles.availabilityNote}>{availabilityNote}</Text>
                    ) : null}
                    <Text style={styles.itemPrice}>${Number(item.price).toFixed(2)}</Text>
                  </View>
                  <TouchableOpacity
                    style={[
                      styles.addBtn,
                      (!item.isAvailable || !available) && styles.addBtnDisabled,
                    ]}
                    onPress={() => handleAddItem(item, cat.name)}
                    disabled={!item.isAvailable || !available}
                  >
                    <Text style={styles.addBtnText}>
                      {!item.isAvailable ? 'Unavailable' : available ? 'Add' : 'Not available'}
                    </Text>
                  </TouchableOpacity>
                </View>
              );
            })}
          </View>
        ))}
      </ScrollView>

      <ViewCartBar absolute />
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { flex: 1 },
  container: { flex: 1, backgroundColor: brand.background },
  content: { padding: 16, paddingBottom: 32 },
  contentWithBar: { paddingBottom: 80 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  empty: { fontSize: 16, color: brand.textSecondary },
  header: { flexDirection: 'row', alignItems: 'center', marginBottom: 8, gap: 10 },
  title: { fontSize: 22, fontWeight: '700', color: brand.textPrimary, flex: 1 },
  badgeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  badge: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12 },
  badgeText: { fontSize: 13, fontWeight: '600' },
  desc: { fontSize: 14, color: brand.textSecondary, marginBottom: 6 },
  address: { fontSize: 13, color: brand.textSecondary, marginBottom: 20 },
  deliveryTypeRow: { marginBottom: 16 },
  deliveryTypeLabel: { fontSize: 14, fontWeight: '600', color: brand.textPrimary, marginBottom: 8 },
  deliveryTypeButtons: { flexDirection: 'row', gap: 10 },
  deliveryTypeBtn: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#d1d5db',
  },
  deliveryTypeBtnActive: { backgroundColor: brand.primary, borderColor: brand.primary },
  deliveryTypeBtnText: { fontSize: 14, color: brand.textPrimary },
  deliveryTypeBtnTextActive: { color: '#fff', fontWeight: '600' },
  section: { marginBottom: 24 },
  sectionTitle: { fontSize: 18, fontWeight: '600', color: brand.textPrimary, marginBottom: 12 },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: brand.surface,
    borderRadius: 10,
    padding: 12,
    marginBottom: 8,
  },
  itemInfo: { flex: 1 },
  itemName: { fontSize: 16, fontWeight: '600', color: brand.textPrimary },
  itemDesc: { fontSize: 13, color: brand.textSecondary, marginTop: 4 },
  availabilityNote: { fontSize: 12, color: brand.textSecondary, marginTop: 2, fontStyle: 'italic' },
  itemPrice: { fontSize: 15, fontWeight: '600', color: brand.primary, marginTop: 4 },
  addBtn: {
    backgroundColor: brand.accent,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
  },
  addBtnDisabled: { backgroundColor: '#d1d5db', opacity: 0.7 },
  addBtnText: { color: '#fff', fontWeight: '600', fontSize: 14 },
});
