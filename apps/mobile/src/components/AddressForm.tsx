import React, { useState } from 'react';
import {
  View,
  TextInput,
  TouchableOpacity,
  Text,
  StyleSheet,
  Alert,
} from 'react-native';
import axios from 'axios';
import { api } from '../api';
import { brand } from '../theme';
import type { Address } from '../types/address';

type AddressFormProps = {
  onSaved: (address: Address) => void;
  onCancel: () => void;
  submitLabel?: string;
};

export function AddressForm({ onSaved, onCancel, submitLabel = 'Save' }: AddressFormProps) {
  const [form, setForm] = useState({
    label: '',
    street: '',
    city: '',
    state: '',
    postalCode: '',
    isDefault: false,
  });
  const [saving, setSaving] = useState(false);

  async function handleSubmit() {
    if (!form.street.trim() || !form.city.trim() || !form.postalCode.trim()) {
      Alert.alert('Required', 'Street, city and postal code are required.');
      return;
    }
    setSaving(true);
    try {
      const { data } = await api.post<Address>('/users/addresses', {
        ...form,
        state: form.state.trim() || undefined,
        label: form.label.trim() || undefined,
      });
      setForm({ label: '', street: '', city: '', state: '', postalCode: '', isDefault: false });
      onSaved(data);
    } catch (err) {
      const msg =
        axios.isAxiosError(err) && err.response?.data?.error
          ? err.response.data.error
          : 'Failed to save address';
      Alert.alert('Error', String(msg));
    } finally {
      setSaving(false);
    }
  }

  return (
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
        <TouchableOpacity style={styles.cancelBtn} onPress={onCancel}>
          <Text style={styles.cancelBtnText}>Cancel</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.saveBtn, saving && styles.saveBtnDisabled]}
          onPress={handleSubmit}
          disabled={saving}
        >
          <Text style={styles.saveBtnText}>{saving ? 'Saving...' : submitLabel}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
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
});
