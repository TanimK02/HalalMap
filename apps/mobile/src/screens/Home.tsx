import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  SectionList,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  TextInput,
  RefreshControl,
  Alert,
  PanResponder,
} from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import * as Location from 'expo-location';
import { api } from '../api';
import { useAuth } from '../context/AuthContext';
import { useFavorites } from '../context/FavoritesContext';
import { Ionicons } from '@expo/vector-icons';
import { brand, halalBadgeStyles, HALAL_LABELS, hoursStatusColors } from '../theme';
import { getHoursLabel, getHoursStatus, type BusinessHoursMap } from '../utils/businessHours';

const SLIDER_THUMB_SIZE = 24;
const SLIDER_TRACK_HEIGHT = 8;

function CustomSlider({
  value,
  min,
  max,
  step,
  onValueChange,
  onSlidingComplete,
}: {
  value: number;
  min: number;
  max: number;
  step: number;
  onValueChange: (v: number) => void;
  onSlidingComplete: (v: number) => void;
}) {
  const trackRef = useRef<View>(null);
  const layoutRef = useRef({ x: 0, width: 1 });
  const lastValueRef = useRef(value);
  const [trackWidth, setTrackWidth] = useState(1);
  const [liveValue, setLiveValue] = useState<number | null>(null);
  useEffect(() => {
    lastValueRef.current = value;
  }, [value]);

  const clamp = useCallback((v: number) => Math.max(min, Math.min(max, v)), [min, max]);
  const clampAndRound = useCallback(
    (v: number) => Math.max(min, Math.min(max, Math.round(v / step) * step)),
    [min, max, step]
  );

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (evt) => {
        trackRef.current?.measureInWindow((x, _y, width) => {
          layoutRef.current = { x, width };
          const pageX = evt.nativeEvent.pageX ?? 0;
          const ratio = (pageX - x) / width;
          const raw = clamp(min + ratio * (max - min));
          setLiveValue(raw);
          const rounded = clampAndRound(raw);
          lastValueRef.current = rounded;
          onValueChange(rounded);
        });
      },
      onPanResponderMove: (evt) => {
        const { x, width } = layoutRef.current;
        const pageX = evt.nativeEvent.pageX ?? 0;
        const ratio = (pageX - x) / width;
        const raw = clamp(min + ratio * (max - min));
        setLiveValue(raw);
        const rounded = clampAndRound(raw);
        lastValueRef.current = rounded;
        onValueChange(rounded);
      },
      onPanResponderRelease: () => {
        const rounded = lastValueRef.current;
        onSlidingComplete(rounded);
        setLiveValue(null);
      },
    })
  ).current;

  const range = max - min;
  const displayValue = liveValue !== null ? liveValue : value;
  const ratio = range > 0 ? (displayValue - min) / range : 0;
  const thumbLeft = ratio * Math.max(0, trackWidth - SLIDER_THUMB_SIZE);

  return (
    <View
      style={customSliderStyles.container}
      ref={trackRef}
      onLayout={(e) => {
        const { width } = e.nativeEvent.layout;
        layoutRef.current.width = width;
        setTrackWidth(width);
      }}
      {...panResponder.panHandlers}
    >
      <View style={customSliderStyles.track}>
        <View style={[customSliderStyles.filledTrack, { width: `${ratio * 100}%` }]} />
      </View>
      <View style={[customSliderStyles.thumb, { left: thumbLeft }]} />
    </View>
  );
}

const customSliderStyles = StyleSheet.create({
  container: {
    width: '100%',
    height: 40,
    justifyContent: 'center',
  },
  track: {
    height: SLIDER_TRACK_HEIGHT,
    borderRadius: SLIDER_TRACK_HEIGHT / 2,
    backgroundColor: '#E5E7EB',
    overflow: 'visible',
  },
  filledTrack: {
    position: 'absolute',
    left: 0,
    top: 0,
    height: SLIDER_TRACK_HEIGHT,
    borderRadius: SLIDER_TRACK_HEIGHT / 2,
    backgroundColor: brand.primary,
  },
  thumb: {
    position: 'absolute',
    width: SLIDER_THUMB_SIZE,
    height: SLIDER_THUMB_SIZE,
    borderRadius: SLIDER_THUMB_SIZE / 2,
    backgroundColor: brand.primary,
    top: (40 - SLIDER_THUMB_SIZE) / 2,
    marginLeft: -SLIDER_THUMB_SIZE / 2,
  },
});

type Restaurant = {
  id: string;
  name: string;
  description: string | null;
  address: string;
  halalStatuses: string[];
  businessHours?: BusinessHoursMap;
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
  const { user } = useAuth();
  const { favoriteRestaurants } = useFavorites();
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [halalFilters, setHalalFilters] = useState<string[]>([]);
  const [search, setSearch] = useState('');
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [locationResolving, setLocationResolving] = useState(true);
  const [manualAddress, setManualAddress] = useState('');
  const [manualSubmitting, setManualSubmitting] = useState(false);
  const [radiusMiles, setRadiusMiles] = useState(5);
  const [distanceFilterExpanded, setDistanceFilterExpanded] = useState(false);
  const [sliderValue, setSliderValue] = useState(5);
  const RADIUS_MIN = 1;
  const RADIUS_MAX = 50;

  useEffect(() => {
    if (distanceFilterExpanded) setSliderValue(radiusMiles);
  }, [distanceFilterExpanded, radiusMiles]);

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
    } catch (_) { }

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
      .then((r) => {
        const list = r.data ?? [];
        const hasDistance = list.some((x) => x.distanceMiles != null);
        const sorted = hasDistance
          ? [...list].sort((a, b) => (a.distanceMiles ?? 999) - (b.distanceMiles ?? 999))
          : list;
        setRestaurants(sorted);
      })
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

  const hasDistanceData = restaurants.length > 0 && restaurants.some((r) => r.distanceMiles != null);

  const withinRadius = hasDistanceData
    ? restaurants.filter((r) => (r.distanceMiles ?? Infinity) <= radiusMiles)
    : [];

  function buildSections(): { title: string; data: Restaurant[] }[] {
    if (withinRadius.length === 0) return [];
    return [{ title: `Within ${radiusMiles} mi`, data: withinRadius }];
  }

  const sections = buildSections();

  const favoritesHeader =
    user && favoriteRestaurants.length > 0 ? (
      <View style={styles.favoritesSection}>
        <Text style={styles.favoritesSectionTitle}>Your favorites</Text>
        <FlatList
          horizontal
          data={favoriteRestaurants}
          keyExtractor={(item) => item.id}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.favoritesList}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.favoriteCard}
              onPress={() =>
                (navigation as { navigate: (s: string, p: object) => void }).navigate(
                  'RestaurantDetail',
                  { restaurantId: item.id, name: item.name }
                )
              }
              activeOpacity={0.7}
            >
              <Text style={styles.favoriteCardTitle} numberOfLines={1}>
                {item.name}
              </Text>
              {item.description ? (
                <Text style={styles.favoriteCardDesc} numberOfLines={2}>
                  {item.description}
                </Text>
              ) : null}
            </TouchableOpacity>
          )}
        />
      </View>
    ) : null;

  function renderRestaurantCard(item: Restaurant) {
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
        {(() => {
          const hours = getHoursLabel(item.businessHours);
          if (!hours.primary) return null;
          const status = getHoursStatus(item.businessHours).status;
          const isOpen = status === 'open';
          return (
            <View
              style={[
                styles.cardHoursPill,
                isOpen ? styles.cardHoursPillOpen : styles.cardHoursPillClosed,
              ]}
            >
              <Text
                style={[
                  styles.cardHoursPillText,
                  isOpen ? styles.cardHoursPillTextOpen : styles.cardHoursPillTextClosed,
                ]}
              >
                {hours.primary}
              </Text>
            </View>
          );
        })()}
        <Text style={styles.cardAddress} numberOfLines={1}>
          {item.address}
        </Text>
        <View style={styles.cardMeta}>
          {item.distanceMiles != null && (
            <Text style={styles.meta}>{Number(item.distanceMiles).toFixed(1)} mi away</Text>
          )}
          {item.offersPickup && <Text style={styles.meta}>Pickup</Text>}
          {item.offersDelivery && <Text style={styles.meta}>Delivery</Text>}
        </View>
      </TouchableOpacity>
    );
  }

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
        {hasDistanceData && (
          <>
            <TouchableOpacity
              style={[
                styles.distanceButton,
                distanceFilterExpanded && styles.distanceButtonActive,
              ]}
              onPress={() => setDistanceFilterExpanded((prev) => !prev)}
              activeOpacity={0.7}
            >
              <Ionicons
                name="car-outline"
                size={18}
                color={distanceFilterExpanded ? '#fff' : brand.textPrimary}
                style={styles.distanceButtonIcon}
              />
              <Text
                style={[
                  styles.distanceButtonText,
                  distanceFilterExpanded && styles.distanceButtonTextActive,
                ]}
              >
                {radiusMiles} mi
              </Text>
            </TouchableOpacity>
            {distanceFilterExpanded && (
              <View style={styles.radiusRow}>
                <Text style={styles.radiusLabel}>Within: {sliderValue} mi</Text>
                <CustomSlider
                  value={sliderValue}
                  min={RADIUS_MIN}
                  max={RADIUS_MAX}
                  step={1}
                  onValueChange={(v: number) => setSliderValue(v)}
                  onSlidingComplete={(v: number) => setRadiusMiles(v)}
                />
              </View>
            )}
          </>
        )}
      </View>
      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={brand.primary} />
        </View>
      ) : hasDistanceData && sections.length > 0 ? (
        <SectionList
          sections={sections}
          keyExtractor={(item) => item.id}
          ListHeaderComponent={favoritesHeader}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[brand.primary]} />
          }
          contentContainerStyle={styles.list}
          stickySectionHeadersEnabled={false}
          renderSectionHeader={() => null}
          renderItem={({ item }) => renderRestaurantCard(item)}
        />
      ) : hasDistanceData && withinRadius.length === 0 ? (
        <ScrollView
          contentContainerStyle={styles.centered}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[brand.primary]} />
          }
        >
          <Text style={styles.empty}>No restaurants within {radiusMiles} mi.</Text>
        </ScrollView>
      ) : (
        <FlatList
          data={restaurants}
          keyExtractor={(item) => item.id}
          ListHeaderComponent={favoritesHeader}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[brand.primary]} />
          }
          contentContainerStyle={styles.list}
          renderItem={({ item }) => renderRestaurantCard(item)}
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
  distanceButton: {
    alignSelf: 'flex-start',
    marginTop: 10,
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: '#d1d5db',
    backgroundColor: brand.surface,
    gap: 2,
  },
  distanceButtonActive: {
    borderColor: brand.primary,
    backgroundColor: brand.primary,
  },
  distanceButtonIcon: { marginRight: 2 },
  distanceButtonText: { fontSize: 14, fontWeight: '600', color: brand.textPrimary },
  distanceButtonTextActive: { color: '#fff' },
  filterChipText: { fontSize: 14, color: brand.textPrimary },
  filterChipTextActive: { color: '#fff', fontWeight: '600' },
  radiusRow: { marginTop: 10 },
  radiusLabel: { fontSize: 13, color: brand.textSecondary, marginBottom: 4 },
  radiusSlider: { width: '100%', height: 24 },
  favoritesSection: { marginBottom: 16 },
  favoritesSectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: brand.textPrimary,
    marginBottom: 10,
    paddingHorizontal: 0,
  },
  favoritesList: { gap: 12, paddingBottom: 4 },
  favoriteCard: {
    width: 160,
    backgroundColor: brand.surface,
    borderRadius: 12,
    padding: 12,
    marginRight: 12,
  },
  favoriteCardTitle: { fontSize: 16, fontWeight: '600', color: brand.textPrimary },
  favoriteCardDesc: { fontSize: 13, color: brand.textSecondary, marginTop: 4 },
  sectionHeader: {
    paddingVertical: 8,
    paddingTop: 16,
    paddingBottom: 4,
  },
  sectionHeaderText: {
    fontSize: 14,
    fontWeight: '600',
    color: brand.primary,
  },
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
  cardHoursPill: {
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 14,
    marginBottom: 4,
  },
  cardHoursPillOpen: { backgroundColor: hoursStatusColors.open.bg },
  cardHoursPillClosed: { backgroundColor: hoursStatusColors.closed.bg },
  cardHoursPillText: { fontSize: 13, fontWeight: '600' },
  cardHoursPillTextOpen: { color: hoursStatusColors.open.text },
  cardHoursPillTextClosed: { color: hoursStatusColors.closed.text },
  cardAddress: { fontSize: 13, color: brand.textSecondary, marginBottom: 6 },
  cardMeta: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  meta: { fontSize: 12, color: brand.primary },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  empty: { fontSize: 16, color: brand.textSecondary },
});
