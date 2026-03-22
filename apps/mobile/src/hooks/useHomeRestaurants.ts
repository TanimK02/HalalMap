import { useCallback, useEffect, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import * as Location from 'expo-location';
import { Alert } from 'react-native';
import { api } from '../api';
import type { Restaurant, AddressWithCoords, RestaurantTag } from '../types/restaurant';

export function useHomeRestaurants() {
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [halalFilters, setHalalFilters] = useState<string[]>([]);
  const [tagFilters, setTagFilters] = useState<string[]>([]);
  const [tagCatalog, setTagCatalog] = useState<RestaurantTag[]>([]);
  const [search, setSearch] = useState('');
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [locationResolving, setLocationResolving] = useState(true);
  const [manualAddress, setManualAddress] = useState('');
  const [manualSubmitting, setManualSubmitting] = useState(false);
  const [radiusMiles, setRadiusMiles] = useState(5);
  const [distanceFilterExpanded, setDistanceFilterExpanded] = useState(false);
  const [sliderValue, setSliderValue] = useState(5);

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
    } catch (_) {}

    try {
      const { data } = await api.get<AddressWithCoords[]>('/users/addresses');
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

  useEffect(() => {
    api
      .get<RestaurantTag[]>('/tags')
      .then((r) => setTagCatalog(r.data ?? []))
      .catch(() => setTagCatalog([]));
  }, []);

  const load = useCallback(() => {
    const params: {
      halalStatuses?: string;
      tags?: string;
      search?: string;
      lat?: string;
      lng?: string;
    } = {};
    if (halalFilters.length > 0) params.halalStatuses = halalFilters.join(',');
    if (tagFilters.length > 0) params.tags = tagFilters.join(',');
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
  }, [halalFilters, tagFilters, search, location]);

  useEffect(() => {
    if (!locationResolving) load();
  }, [locationResolving, halalFilters, tagFilters, search, location, load]);

  function toggleHalalFilter(value: string) {
    if (!value) {
      setHalalFilters([]);
      return;
    }
    setHalalFilters((prev) =>
      prev.includes(value) ? prev.filter((s) => s !== value) : [...prev, value]
    );
  }

  function toggleTagFilter(tagId: string) {
    setTagFilters((prev) =>
      prev.includes(tagId) ? prev.filter((id) => id !== tagId) : [...prev, tagId]
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
      Alert.alert(
        'Not found',
        'Could not find that address. Try a full address with city and state.'
      );
    } finally {
      setManualSubmitting(false);
    }
  }

  const hasDistanceData =
    restaurants.length > 0 && restaurants.some((r) => r.distanceMiles != null);

  const withinRadius = hasDistanceData
    ? restaurants.filter((r) => (r.distanceMiles ?? Infinity) <= radiusMiles)
    : [];

  const sections: { title: string; data: Restaurant[] }[] =
    withinRadius.length === 0 ? [] : [{ title: `Within ${radiusMiles} mi`, data: withinRadius }];

  return {
    restaurants,
    loading,
    refreshing,
    radiusMiles,
    setRadiusMiles,
    distanceFilterExpanded,
    setDistanceFilterExpanded,
    sliderValue,
    setSliderValue,
    halalFilters,
    toggleHalalFilter,
    tagCatalog,
    tagFilters,
    toggleTagFilter,
    search,
    setSearch,
    location,
    locationResolving,
    manualAddress,
    setManualAddress,
    manualSubmitting,
    submitManualAddress,
    load,
    onRefresh,
    hasDistanceData,
    withinRadius,
    sections,
  };
}
