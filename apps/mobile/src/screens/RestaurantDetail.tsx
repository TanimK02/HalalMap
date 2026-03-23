import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  Linking,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import { api } from '../api';
import { useCart } from '../context/CartContext';
import { useConfig } from '../context/ConfigContext';
import { useFavorites } from '../context/FavoritesContext';
import { useAuth } from '../context/AuthContext';
import { ViewCartBar } from '../components/ViewCartBar';
import { ScreenHeader } from '../components/ScreenHeader';
import { MenuItemRow } from '../components/MenuItemRow';
import { brand, halalBadgeStyles, HALAL_LABELS } from '../theme';
import { getHoursLabel } from '../utils/businessHours';
import { getDirectionsUrl } from '../utils/directions';
import type { RestaurantDetailData } from '../types/restaurant';

type RouteParams = { restaurantId: string; name: string };

export default function RestaurantDetail() {
  const navigation = useNavigation();
  const route = useRoute<RouteProp<{ params: RouteParams }, 'params'>>();
  const { restaurantId, name: restaurantName } = route.params ?? { restaurantId: '', name: '' };
  const { addItem, items, restaurantId: cartRestaurantId } = useCart();
  const { user } = useAuth();
  const { enableDelivery } = useConfig();
  const { isFavorited, addFavorite, removeFavorite } = useFavorites();
  const [data, setData] = useState<RestaurantDetailData | null>(null);
  const [loading, setLoading] = useState(true);
  const [deliveryType, setDeliveryType] = useState<'PICKUP' | 'DELIVERY'>('PICKUP');
  const [favoriteBusy, setFavoriteBusy] = useState(false);

  useEffect(() => {
    if (!restaurantId) return;
    api
      .get<RestaurantDetailData>(`/restaurants/${restaurantId}`)
      .then((r) => setData(r.data))
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, [restaurantId]);

  useEffect(() => {
    if (!enableDelivery) setDeliveryType('PICKUP');
  }, [enableDelivery]);

  function canAddForDeliveryType(
    item: { availableForPickup?: boolean; availableForDelivery?: boolean }
  ): boolean {
    if (!enableDelivery) return item.availableForPickup !== false;
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
      <View style={styles.wrapper}>
        <ScreenHeader title="Restaurant" />
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={brand.primary} />
        </View>
      </View>
    );
  }
  if (!data) {
    return (
      <View style={styles.wrapper}>
        <ScreenHeader title="Restaurant" />
        <View style={styles.centered}>
          <Text style={styles.empty}>Restaurant not found.</Text>
        </View>
      </View>
    );
  }

  const badgeStyle = (status: string) =>
    halalBadgeStyles[status] ?? { bg: '#E5E7EB', text: '#1F2933' };

  return (
    <View style={styles.wrapper}>
      <ScreenHeader title={data.name} />
      <ScrollView
        style={styles.container}
        contentContainerStyle={[styles.content, items.length > 0 && styles.contentWithBar]}
      >
        <View style={styles.header}>
          <Text style={styles.title}>{data.name}</Text>
          {user ? (
            <TouchableOpacity
              style={styles.favoriteBtn}
              onPress={async () => {
                if (favoriteBusy) return;
                setFavoriteBusy(true);
                try {
                  if (isFavorited(data.id)) await removeFavorite(data.id);
                  else await addFavorite(data.id);
                } finally {
                  setFavoriteBusy(false);
                }
              }}
              disabled={favoriteBusy}
              accessibilityLabel={
                isFavorited(data.id) ? 'Remove from favorites' : 'Add to favorites'
              }
            >
              <Ionicons
                name={isFavorited(data.id) ? 'heart' : 'heart-outline'}
                size={26}
                color={isFavorited(data.id) ? '#dc2626' : brand.textSecondary}
              />
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={styles.favoriteBtn}
              onPress={() =>
                Alert.alert(
                  'Sign in to save favorites',
                  'Create an account or sign in to save your favorite restaurants.',
                  [
                    { text: 'Cancel', style: 'cancel' },
                    {
                      text: 'Sign in',
                      onPress: () =>
                        (navigation as { navigate: (s: string) => void }).navigate('Login'),
                    },
                  ]
                )
              }
              accessibilityLabel="Sign in to save favorites"
            >
              <Ionicons name="heart-outline" size={26} color={brand.textSecondary} />
            </TouchableOpacity>
          )}
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
        {(() => {
          const hours = getHoursLabel(data.businessHours);
          if (!hours.primary && !hours.todayLine) return null;
          return (
            <View style={styles.hoursBlock}>
              {hours.primary ? (
                <View style={styles.hoursRow}>
                  <Text style={styles.hoursPrimary}>{hours.primary}</Text>
                  {hours.secondary ? (
                    <Text style={styles.hoursSecondary}> · {hours.secondary}</Text>
                  ) : null}
                </View>
              ) : null}
              {hours.todayLine ? (
                <Text style={styles.hoursToday}>{hours.todayLine}</Text>
              ) : null}
            </View>
          );
        })()}
        <Text style={styles.address}>{data.address}</Text>

        <View style={styles.callDirectionsRow}>
          {data.phone != null && data.phone.trim() !== '' ? (
            <TouchableOpacity
              style={styles.callDirectionsBtn}
              onPress={async () => {
                try {
                  const url = `tel:${data.phone!.trim()}`;
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
          {getDirectionsUrl(data.latitude, data.longitude, data.address) ? (
            <TouchableOpacity
              style={styles.callDirectionsBtn}
              onPress={async () => {
                try {
                  const url = getDirectionsUrl(data.latitude, data.longitude, data.address);
                  if (!url) return;
                  const can = await Linking.canOpenURL(url);
                  if (can) await Linking.openURL(url);
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

        <View style={styles.deliveryTypeRow}>
          <Text style={styles.deliveryTypeLabel}>Order for:</Text>
          <View style={styles.deliveryTypeButtons}>
            <TouchableOpacity
              style={[
                styles.deliveryTypeBtn,
                deliveryType === 'PICKUP' && styles.deliveryTypeBtnActive,
              ]}
              onPress={() => setDeliveryType('PICKUP')}
            >
              <Text
                style={[
                  styles.deliveryTypeBtnText,
                  deliveryType === 'PICKUP' && styles.deliveryTypeBtnTextActive,
                ]}
              >
                Pickup
              </Text>
            </TouchableOpacity>
            {enableDelivery && (
              <TouchableOpacity
                style={[
                  styles.deliveryTypeBtn,
                  deliveryType === 'DELIVERY' && styles.deliveryTypeBtnActive,
                ]}
                onPress={() => setDeliveryType('DELIVERY')}
              >
                <Text
                  style={[
                    styles.deliveryTypeBtnText,
                    deliveryType === 'DELIVERY' && styles.deliveryTypeBtnTextActive,
                  ]}
                >
                  Delivery
                </Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        {data.menuCategories.map((cat) => (
          <View key={cat.id} style={styles.section}>
            <Text style={styles.sectionTitle}>{cat.name}</Text>
            {(cat.items ?? []).map((item) => (
              <MenuItemRow
                key={item.id}
                item={item}
                categoryName={cat.name}
                canAdd={item.isAvailable && canAddForDeliveryType(item)}
                onAdd={() => handleAddItem(item, cat.name)}
              />
            ))}
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 10,
    flexWrap: 'wrap',
  },
  title: { fontSize: 22, fontWeight: '700', color: brand.textPrimary, flex: 1, minWidth: 0 },
  favoriteBtn: { padding: 4, marginLeft: 4 },
  badgeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  badge: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12 },
  badgeText: { fontSize: 13, fontWeight: '600' },
  desc: { fontSize: 14, color: brand.textSecondary, marginBottom: 6 },
  hoursBlock: { marginBottom: 12 },
  hoursRow: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center' },
  hoursPrimary: { fontSize: 15, color: brand.primary, fontWeight: '600' },
  hoursSecondary: { fontSize: 14, color: brand.textSecondary },
  hoursToday: { fontSize: 14, color: brand.textSecondary, marginTop: 4 },
  address: { fontSize: 13, color: brand.textSecondary, marginBottom: 12 },
  callDirectionsRow: { flexDirection: 'row', gap: 12, marginBottom: 20 },
  callDirectionsBtn: {
    backgroundColor: brand.primary,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
  },
  callDirectionsBtnText: { color: '#fff', fontWeight: '600', fontSize: 14 },
  deliveryTypeRow: { marginBottom: 16 },
  deliveryTypeLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: brand.textPrimary,
    marginBottom: 8,
  },
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
});
