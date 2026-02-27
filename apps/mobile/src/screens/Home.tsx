import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  TextInput,
  RefreshControl,
  Alert,
} from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import * as Location from 'expo-location';
import { api } from '../api';
import { brand, halalBadgeStyles, HALAL_LABELS } from '../theme';

type Restaurant = {
  id: string;
  name: string;
  description: string | null;
  address: string;
  halalStatuses: string[];
  offersPickup: boolean;
  offersDelivery: boolean;
  distanceMiles?: number;
};

type Address = {
  id: string;
  latitude: number | null;
  longitude: number | null;
  isDefault: boolean;
};

export default function Home() {
  const navigation = useNavigation();
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [halalFilters, setHalalFilters] = useState<string[]>([]);
  const [search, setSearch] = useState('');
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [locationResolving, setLocationResolving] = useState(true);
  const [manualAddress, setManualAddress] = useState('');
  const [manualSubmitting, setManualSubmitting] = useState(false);

  const resolveLocation = useCallback(async () => {
    setLocationResolving(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status === 'granted') {
        const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
        setLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setLocationResolving(false);
        return;
      }
    } catch (_) {}

    try {
      const { data } = await api.get<Address[]>('/users/addresses');
      const defaultAddr = data?.find((a) => a.isDefault && a.latitude != null && a.longitude != null);
      if (defaultAddr?.latitude != null && defaultAddr?.longitude != null) {
        setLocation({ lat: defaultAddr.latitude, lng: defaultAddr.longitude });
      }
    } catch (_) {
      // Not logged in or no addresses
    }
    setLocationResolving(false);
  }, []);

  useFocusEffect(
    useCallback(() => {
      resolveLocation();
    }, [resolveLocation])
  );

  const load = useCallback(() => {
    const params: { halalStatuses?: string; search?: string; lat?: string; lng?: string } = {};
    if (halalFilters.length > 0) params.halalStatuses = halalFilters.join(',');
    if (search.trim()) params.search = search.trim();
    if (location) {
      params.lat = String(location.lat);
      params.lng = String(location.lng);
    }
    return api
      .get<Restaurant[]>('/restaurants', { params })
      .then((r) => setRestaurants(r.data))
      .catch(() => setRestaurants([]))
      .finally(() => {
        setLoading(false);
        setRefreshing(false);
      });
  }, [halalFilters, search, location]);

  useEffect(() => {
    if (!locationResolving) load();
  }, [locationResolving, halalFilters, search, location, load]);

  function toggleHalalFilter(value: string) {
    if (!value) {
      setHalalFilters([]);
      return;
    }
    setHalalFilters((prev) =>
      prev.includes(value) ? prev.filter((s) => s !== value) : [...prev, value]
    );
  }

  function onRefresh() {
    setRefreshing(true);
    load();
  }

  async function submitManualAddress() {
    const addr = manualAddress.trim();
    if (!addr) return;
    setManualSubmitting(true);
    try {
      const { data } = await api.get<{ latitude: number; longitude: number }>('/geocode', {
        params: { address: addr },
      });
      setLocation({ lat: data.latitude, lng: data.longitude });
      setManualAddress('');
    } catch {
      Alert.alert('Not found', 'Could not find that address. Try a full address with city and state.');
    } finally {
      setManualSubmitting(false);
    }
  }

  const badgeStyle = (status: string) => halalBadgeStyles[status] ?? { bg: '#E5E7EB', text: '#1F2933' };

  return (
    <View style={styles.container}>
      <View style={styles.filters}>
        <TextInput
          style={styles.search}
          placeholder="Search restaurants..."
          placeholderTextColor={brand.textSecondary}
          value={search}
          onChangeText={setSearch}
        />
        {!location && !locationResolving && (
          <View style={styles.locationHint}>
            <Text style={styles.locationHintText}>
              Enable location or add an address to see nearby restaurants.
            </Text>
            <View style={styles.manualRow}>
              <TextInput
                style={styles.manualInput}
                placeholder="Search near this address..."
                placeholderTextColor={brand.textSecondary}
                value={manualAddress}
                onChangeText={setManualAddress}
              />
              <TouchableOpacity
                style={[styles.manualButton, manualSubmitting && styles.manualButtonDisabled]}
                onPress={submitManualAddress}
                disabled={manualSubmitting || !manualAddress.trim()}
              >
                <Text style={styles.manualButtonText}>
                  {manualSubmitting ? '...' : 'Use'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
        <FlatList
          horizontal
          data={[
            { value: '', label: 'All' },
            ...Object.entries(HALAL_LABELS).map(([value, label]) => ({ value, label })),
          ]}
          keyExtractor={(item) => item.value || 'all'}
          renderItem={({ item }) => {
            const isActive = item.value ? halalFilters.includes(item.value) : halalFilters.length === 0;
            return (
              <TouchableOpacity
                style={[
                  styles.filterChip,
                  isActive && styles.filterChipActive,
                ]}
                onPress={() => toggleHalalFilter(item.value)}
              >
                <Text
                  style={[
                    styles.filterChipText,
                    isActive && styles.filterChipTextActive,
                  ]}
                >
                  {item.label}
                </Text>
              </TouchableOpacity>
            );
          }}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterList}
        />
      </View>
      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={brand.primary} />
        </View>
      ) : (
        <FlatList
          data={restaurants}
          keyExtractor={(item) => item.id}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[brand.primary]} />
          }
          contentContainerStyle={styles.list}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.card}
              onPress={() =>
                (navigation as { navigate: (s: string, p: object) => void }).navigate(
                  'RestaurantDetail',
                  { restaurantId: item.id, name: item.name }
                )
              }
              activeOpacity={0.7}
            >
              <View style={styles.cardHeader}>
                <Text style={styles.cardTitle}>{item.name}</Text>
                <View style={styles.badgeRow}>
                  {(item.halalStatuses ?? []).map((status) => {
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
              {item.description ? (
                <Text style={styles.cardDesc} numberOfLines={2}>
                  {item.description}
                </Text>
              ) : null}
              <Text style={styles.cardAddress} numberOfLines={1}>
                {item.address}
              </Text>
              <View style={styles.cardMeta}>
                {item.distanceMiles != null && (
                  <Text style={styles.meta}>{Number(item.distanceMiles).toFixed(1)} mi away</Text>
                )}
                {item.offersPickup && (
                  <Text style={styles.meta}>Pickup</Text>
                )}
                {item.offersDelivery && (
                  <Text style={styles.meta}>Delivery</Text>
                )}
              </View>
            </TouchableOpacity>
          )}
          ListEmptyComponent={
            <View style={styles.centered}>
              <Text style={styles.empty}>No restaurants found.</Text>
            </View>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: brand.background },
  filters: {
    backgroundColor: brand.surface,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  search: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    color: brand.textPrimary,
    marginBottom: 10,
  },
  locationHint: { marginBottom: 10 },
  locationHintText: { fontSize: 12, color: brand.textSecondary, marginBottom: 6 },
  manualRow: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  manualInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 14,
    color: brand.textPrimary,
  },
  manualButton: {
    backgroundColor: brand.primary,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
  },
  manualButtonDisabled: { opacity: 0.6 },
  manualButtonText: { color: '#fff', fontWeight: '600', fontSize: 14 },
  filterList: { gap: 8 },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#E5E7EB',
    marginRight: 8,
  },
  filterChipActive: { backgroundColor: brand.primary },
  filterChipText: { fontSize: 14, color: brand.textPrimary },
  filterChipTextActive: { color: '#fff', fontWeight: '600' },
  list: { padding: 16, paddingBottom: 32 },
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
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  cardTitle: { fontSize: 18, fontWeight: '600', color: brand.textPrimary, flex: 1 },
  badgeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  badgeText: { fontSize: 12, fontWeight: '600' },
  cardDesc: { fontSize: 14, color: brand.textSecondary, marginBottom: 4 },
  cardAddress: { fontSize: 13, color: brand.textSecondary, marginBottom: 6 },
  cardMeta: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  meta: { fontSize: 12, color: brand.primary },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  empty: { fontSize: 16, color: brand.textSecondary },
});
