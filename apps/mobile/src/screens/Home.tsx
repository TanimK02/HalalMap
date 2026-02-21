import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  TextInput,
  RefreshControl,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { api } from '../api';
import { brand, halalBadgeStyles, HALAL_LABELS } from '../theme';

type Restaurant = {
  id: string;
  name: string;
  description: string | null;
  address: string;
  halalStatus: string;
  offersPickup: boolean;
  offersDelivery: boolean;
};

export default function Home() {
  const navigation = useNavigation();
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [halalFilter, setHalalFilter] = useState<string>('');
  const [search, setSearch] = useState('');

  function load() {
    const params: { halalStatus?: string; search?: string } = {};
    if (halalFilter) params.halalStatus = halalFilter;
    if (search.trim()) params.search = search.trim();
    return api
      .get<Restaurant[]>('/restaurants', { params })
      .then((r) => setRestaurants(r.data))
      .catch(() => setRestaurants([]))
      .finally(() => {
        setLoading(false);
        setRefreshing(false);
      });
  }

  useEffect(() => {
    load();
  }, [halalFilter, search]);

  function onRefresh() {
    setRefreshing(true);
    load();
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
        <FlatList
          horizontal
          data={[
            { value: '', label: 'All' },
            ...Object.entries(HALAL_LABELS).map(([value, label]) => ({ value, label })),
          ]}
          keyExtractor={(item) => item.value || 'all'}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[
                styles.filterChip,
                halalFilter === item.value && styles.filterChipActive,
              ]}
              onPress={() => setHalalFilter(item.value)}
            >
              <Text
                style={[
                  styles.filterChipText,
                  halalFilter === item.value && styles.filterChipTextActive,
                ]}
              >
                {item.label}
              </Text>
            </TouchableOpacity>
          )}
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
          renderItem={({ item }) => {
            const style = badgeStyle(item.halalStatus);
            return (
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
                  <View style={[styles.badge, { backgroundColor: style.bg }]}>
                    <Text style={[styles.badgeText, { color: style.text }]}>
                      {HALAL_LABELS[item.halalStatus] ?? item.halalStatus}
                    </Text>
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
                  {item.offersPickup && (
                    <Text style={styles.meta}>Pickup</Text>
                  )}
                  {item.offersDelivery && (
                    <Text style={styles.meta}>Delivery</Text>
                  )}
                </View>
              </TouchableOpacity>
            );
          }}
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
  filters: { backgroundColor: brand.surface, paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#E5E7EB' },
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
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  cardTitle: { fontSize: 18, fontWeight: '600', color: brand.textPrimary, flex: 1 },
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  badgeText: { fontSize: 12, fontWeight: '600' },
  cardDesc: { fontSize: 14, color: brand.textSecondary, marginBottom: 4 },
  cardAddress: { fontSize: 13, color: brand.textSecondary, marginBottom: 6 },
  cardMeta: { flexDirection: 'row', gap: 8 },
  meta: { fontSize: 12, color: brand.primary },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  empty: { fontSize: 16, color: brand.textSecondary },
});
