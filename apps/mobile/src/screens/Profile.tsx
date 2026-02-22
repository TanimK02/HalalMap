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
import { useAuth } from '../context/AuthContext';
import { api } from '../api';
import { brand } from '../theme';
import { AddressForm } from '../components/AddressForm';
import type { Address } from '../types/address';

export default function Profile() {
  const { user, logout } = useAuth();
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);

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
        <Text style={styles.sectionTitle}>Saved addresses</Text>
        {addresses.map((addr) => (
          <View key={addr.id} style={styles.addressCard}>
            <Text style={styles.addressText}>
              {addr.label ? `${addr.label}: ` : ''}
              {addr.street}, {addr.city} {addr.state ? ` ${addr.state}` : ''} {addr.postalCode}
            </Text>
            {addr.isDefault && (
              <Text style={styles.defaultBadge}>Default</Text>
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
  addBtn: { padding: 12, borderWidth: 1, borderColor: brand.primary, borderRadius: 8, alignItems: 'center' },
  addBtnText: { color: brand.primary, fontWeight: '600' },
  logoutBtn: { marginTop: 24, padding: 14, backgroundColor: '#fef2f2', borderRadius: 8, alignItems: 'center' },
  logoutBtnText: { color: '#b91c1c', fontWeight: '600' },
});
