import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  TextInput,
  ActivityIndicator,
  Alert,
} from 'react-native';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { api } from '../api';
import { brand } from '../theme';

type Address = {
  id: string;
  label: string | null;
  street: string;
  city: string;
  state: string | null;
  postalCode: string;
  isDefault: boolean;
};

export default function Profile() {
  const { user, logout } = useAuth();
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ label: '', street: '', city: '', state: '', postalCode: '', isDefault: false });

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

  async function handleAddAddress() {
    if (!form.street.trim() || !form.city.trim() || !form.postalCode.trim()) {
      Alert.alert('Required', 'Street, city and postal code are required.');
      return;
    }
    setSaving(true);
    try {
      await api.post('/users/addresses', {
        ...form,
        state: form.state.trim() || undefined,
        label: form.label.trim() || undefined,
      });
      setForm({ label: '', street: '', city: '', state: '', postalCode: '', isDefault: false });
      setShowForm(false);
      load();
    } catch (err) {
      const msg =
        axios.isAxiosError(err) && err.response?.data?.error
          ? err.response.data.error
          : 'Failed to add address';
      Alert.alert('Error', String(msg));
    } finally {
      setSaving(false);
    }
  }

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
          <View style={styles.form}>
            <TextInput
              style={styles.input}
              placeholder="Label (optional)"
              placeholderTextColor={brand.textSecondary}
              value={form.label}
              onChangeText={(t) => setForm((f) => ({ ...f, label: t }))}
            />
            <TextInput
              style={styles.input}
              placeholder="Street *"
              placeholderTextColor={brand.textSecondary}
              value={form.street}
              onChangeText={(t) => setForm((f) => ({ ...f, street: t }))}
            />
            <TextInput
              style={styles.input}
              placeholder="City *"
              placeholderTextColor={brand.textSecondary}
              value={form.city}
              onChangeText={(t) => setForm((f) => ({ ...f, city: t }))}
            />
            <TextInput
              style={styles.input}
              placeholder="State (optional)"
              placeholderTextColor={brand.textSecondary}
              value={form.state}
              onChangeText={(t) => setForm((f) => ({ ...f, state: t }))}
            />
            <TextInput
              style={styles.input}
              placeholder="Postal code *"
              placeholderTextColor={brand.textSecondary}
              value={form.postalCode}
              onChangeText={(t) => setForm((f) => ({ ...f, postalCode: t }))}
            />
            <TouchableOpacity
              style={styles.checkboxRow}
              onPress={() => setForm((f) => ({ ...f, isDefault: !f.isDefault }))}
            >
              <Text style={styles.checkboxLabel}>Set as default</Text>
              <View style={[styles.checkbox, form.isDefault && styles.checkboxChecked]} />
            </TouchableOpacity>
            <View style={styles.formActions}>
              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={() => setShowForm(false)}
              >
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.saveBtn, saving && styles.saveBtnDisabled]}
                onPress={handleAddAddress}
                disabled={saving}
              >
                <Text style={styles.saveBtnText}>{saving ? 'Saving...' : 'Save'}</Text>
              </TouchableOpacity>
            </View>
          </View>
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
  form: { marginTop: 8 },
  input: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    color: brand.textPrimary,
    marginBottom: 10,
  },
  checkboxRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  checkboxLabel: { fontSize: 14, color: brand.textPrimary, marginRight: 8 },
  checkbox: { width: 22, height: 22, borderWidth: 1, borderColor: '#d1d5db', borderRadius: 4 },
  checkboxChecked: { backgroundColor: brand.primary },
  formActions: { flexDirection: 'row', gap: 12 },
  cancelBtn: { flex: 1, padding: 12, borderRadius: 8, borderWidth: 1, borderColor: '#d1d5db', alignItems: 'center' },
  cancelBtnText: { color: brand.textPrimary },
  saveBtn: { flex: 1, padding: 12, borderRadius: 8, backgroundColor: brand.primary, alignItems: 'center' },
  saveBtnDisabled: { opacity: 0.7 },
  saveBtnText: { color: '#fff', fontWeight: '600' },
  logoutBtn: { marginTop: 24, padding: 14, backgroundColor: '#fef2f2', borderRadius: 8, alignItems: 'center' },
  logoutBtnText: { color: '#b91c1c', fontWeight: '600' },
});
