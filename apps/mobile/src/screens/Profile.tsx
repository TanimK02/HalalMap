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
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../context/AuthContext';
import { useFavorites } from '../context/FavoritesContext';
import { api } from '../api';
import { brand } from '../theme';
import { AddressForm } from '../components/AddressForm';
import type { Address } from '../types/address';

export default function Profile() {
  const navigation = useNavigation();
  const { user, logout } = useAuth();
  const { favoriteRestaurants, loading: favoritesLoading } = useFavorites();
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [settingDefaultId, setSettingDefaultId] = useState<string | null>(null);

  function load() {
    api
      .get<Address[]>('/users/addresses')
      .then((r) => setAddresses(r.data))
      .catch(() => setAddresses([]))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    load();
  }, []);

  async function handleLogout() {
    Alert.alert('Log out', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Log out', style: 'destructive', onPress: () => logout() },
    ]);
  }

  async function handleSetDefault(addr: Address) {
    if (settingDefaultId) return;
    setSettingDefaultId(addr.id);
    try {
      await api.patch(`/users/addresses/${addr.id}`, { isDefault: true });
      load();
    } catch (e: unknown) {
      const message = e && typeof e === 'object' && 'response' in e
        ? (e as { response?: { status?: number } }).response?.status === 404
          ? 'Address not found.'
          : 'Could not set default address.'
        : 'Could not set default address.';
      Alert.alert('Error', message);
    } finally {
      setSettingDefaultId(null);
    }
  }

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={brand.primary} />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Account</Text>
        <Text style={styles.text}>{user?.name}</Text>
        <Text style={styles.textSecondary}>{user?.email}</Text>
      </View>
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Favorite restaurants</Text>
        {favoritesLoading ? (
          <ActivityIndicator size="small" color={brand.primary} style={styles.favLoader} />
        ) : favoriteRestaurants.length === 0 ? (
          <Text style={styles.emptyFav}>You haven&apos;t saved any restaurants yet.</Text>
        ) : (
          favoriteRestaurants.map((rest) => (
            <TouchableOpacity
              key={rest.id}
              style={styles.favCard}
              onPress={() =>
                (navigation as { navigate: (s: string, p: object) => void }).navigate(
                  'RestaurantDetail',
                  { restaurantId: rest.id, name: rest.name }
                )
              }
            >
              <Text style={styles.favCardTitle}>{rest.name}</Text>
              {rest.address ? (
                <Text style={styles.favCardAddress} numberOfLines={1}>
                  {rest.address}
                </Text>
              ) : null}
            </TouchableOpacity>
          ))
        )}
      </View>
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Saved addresses</Text>
        {addresses.map((addr) => (
          <View key={addr.id} style={styles.addressCard}>
            <Text style={styles.addressText}>
              {addr.label ? `${addr.label}: ` : ''}
              {addr.street}, {addr.city} {addr.state ? ` ${addr.state}` : ''} {addr.postalCode}
            </Text>
            {addr.isDefault ? (
              <Text style={styles.defaultBadge}>Default</Text>
            ) : (
              <TouchableOpacity
                style={styles.setDefaultLink}
                onPress={() => handleSetDefault(addr)}
                disabled={settingDefaultId === addr.id}
              >
                {settingDefaultId === addr.id ? (
                  <ActivityIndicator size="small" color={brand.primary} />
                ) : (
                  <Text style={styles.setDefaultLinkText}>Set as default</Text>
                )}
              </TouchableOpacity>
            )}
          </View>
        ))}
        {!showForm ? (
          <TouchableOpacity style={styles.addBtn} onPress={() => setShowForm(true)}>
            <Text style={styles.addBtnText}>+ Add address</Text>
          </TouchableOpacity>
        ) : (
          <AddressForm
            onSaved={() => {
              setShowForm(false);
              load();
            }}
            onCancel={() => setShowForm(false)}
            submitLabel="Save"
          />
        )}
      </View>
      <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
        <Text style={styles.logoutBtnText}>Log out</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: brand.background },
  content: { padding: 16, paddingBottom: 32 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  section: { marginBottom: 24 },
  sectionTitle: { fontSize: 18, fontWeight: '600', color: brand.textPrimary, marginBottom: 12 },
  text: { fontSize: 16, color: brand.textPrimary },
  textSecondary: { fontSize: 14, color: brand.textSecondary, marginTop: 4 },
  addressCard: {
    backgroundColor: brand.surface,
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
  },
  addressText: { fontSize: 14, color: brand.textPrimary },
  defaultBadge: { fontSize: 12, color: brand.primary, marginTop: 4 },
  setDefaultLink: { marginTop: 4, alignSelf: 'flex-start', minHeight: 24, justifyContent: 'center' },
  setDefaultLinkText: { fontSize: 12, color: brand.primary, fontWeight: '500' },
  addBtn: { padding: 12, borderWidth: 1, borderColor: brand.primary, borderRadius: 8, alignItems: 'center' },
  addBtnText: { color: brand.primary, fontWeight: '600' },
  logoutBtn: { marginTop: 24, padding: 14, backgroundColor: '#fef2f2', borderRadius: 8, alignItems: 'center' },
  logoutBtnText: { color: '#b91c1c', fontWeight: '600' },
  favLoader: { marginVertical: 8 },
  emptyFav: { fontSize: 14, color: brand.textSecondary, fontStyle: 'italic' },
  favCard: {
    backgroundColor: brand.surface,
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
  },
  favCardTitle: { fontSize: 16, fontWeight: '600', color: brand.textPrimary },
  favCardAddress: { fontSize: 13, color: brand.textSecondary, marginTop: 4 },
});
