import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  TextInput,
  TouchableOpacity,
  Text,
  StyleSheet,
  Alert,
  ActivityIndicator,
  ScrollView,
  Keyboard,
} from 'react-native';
import axios from 'axios';
import { api } from '../api';
import { brand } from '../theme';
import type { Address } from '../types/address';

type GeocodeSuggestion = {
  displayName: string;
  latitude: number;
  longitude: number;
  address?: {
    street: string;
    city: string;
    state?: string;
    postalCode?: string;
  };
};

type AddressFormProps = {
  onSaved: (address: Address) => void;
  onCancel: () => void;
  submitLabel?: string;
};

const SUGGESTION_DEBOUNCE_MS = 350;

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
  const [addressSearch, setAddressSearch] = useState('');
  const [suggestions, setSuggestions] = useState<GeocodeSuggestion[]>([]);
  const [suggestionsLoading, setSuggestionsLoading] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const latestSearchRef = useRef(addressSearch);
  latestSearchRef.current = addressSearch;
  useEffect(() => {
    const q = addressSearch.trim();
    if (!q || q.length < 3) {
      setSuggestions([]);
      setSuggestionsLoading(false);
      return;
    }
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      debounceRef.current = null;
      setSuggestionsLoading(true);
      api
        .get<GeocodeSuggestion[]>('/geocode', { params: { address: q, limit: 5 } })
        .then(({ data }) => {
          if (latestSearchRef.current.trim() === q) {
            setSuggestions(Array.isArray(data) ? data : []);
          }
        })
        .catch(() => {
          if (latestSearchRef.current.trim() === q) setSuggestions([]);
        })
        .finally(() => {
          if (latestSearchRef.current.trim() === q) setSuggestionsLoading(false);
        });
    }, SUGGESTION_DEBOUNCE_MS);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [addressSearch]);

  function pickSuggestion(s: GeocodeSuggestion) {
    Keyboard.dismiss();
    setAddressSearch('');
    setSuggestions([]);
    if (s.address) {
      setForm((f) => ({
        ...f,
        street: s.address!.street ?? f.street,
        city: s.address!.city ?? f.city,
        state: s.address!.state ?? f.state ?? '',
        postalCode: s.address!.postalCode ?? f.postalCode ?? '',
      }));
    } else if (s.displayName) {
      setForm((f) => ({ ...f, street: s.displayName }));
    }
  }

  function buildAddressString(): string {
    const parts = [
      form.street.trim(),
      form.city.trim(),
      form.state.trim(),
      form.postalCode.trim(),
    ].filter(Boolean);
    return parts.join(', ');
  }

  async function handleSubmit() {
    if (!form.street.trim() || !form.city.trim() || !form.postalCode.trim()) {
      Alert.alert('Required', 'Street, city and postal code are required.');
      return;
    }
    setSaving(true);
    try {
      const addressStr = buildAddressString();
      try {
        await api.get('/geocode', { params: { address: addressStr } });
      } catch (geocodeErr) {
        if (axios.isAxiosError(geocodeErr) && geocodeErr.response?.status === 404) {
          Alert.alert(
            'Address not found',
            'We couldn\'t verify this address. You can save it anyway or edit and try again.',
            [
              { text: 'Edit', style: 'cancel' },
              {
                text: 'Save anyway',
                onPress: () => {
                  setSaving(true);
                  saveAddressAndResolve()
                    .catch((err) => {
                      const msg =
                        axios.isAxiosError(err) && err.response?.data?.error
                          ? err.response.data.error
                          : 'Failed to save address';
                      Alert.alert('Error', String(msg));
                    })
                    .finally(() => setSaving(false));
                },
              },
            ]
          );
          return;
        }
        throw geocodeErr;
      }
      await saveAddressAndResolve();
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

  async function saveAddressAndResolve() {
    const { data } = await api.post<Address>('/users/addresses', {
      ...form,
      state: form.state.trim() || undefined,
      label: form.label.trim() || undefined,
    });
    setForm({ label: '', street: '', city: '', state: '', postalCode: '', isDefault: false });
    onSaved(data);
  }

  return (
    <View style={styles.form}>
      <Text style={styles.searchLabel}>Search address (optional)</Text>
      <TextInput
        style={styles.input}
        placeholder="Type address for suggestions..."
        placeholderTextColor={brand.textSecondary}
        value={addressSearch}
        onChangeText={setAddressSearch}
      />
      {suggestionsLoading && (
        <View style={styles.suggestionsLoading}>
          <ActivityIndicator size="small" color={brand.primary} />
        </View>
      )}
      {!suggestionsLoading && suggestions.length > 0 && (
        <View style={styles.suggestionsBox}>
          <ScrollView
            keyboardShouldPersistTaps="handled"
            nestedScrollEnabled
            style={styles.suggestionsScroll}
          >
            {suggestions.map((s, i) => (
              <TouchableOpacity
                key={`${s.displayName}-${i}`}
                style={styles.suggestionRow}
                onPress={() => pickSuggestion(s)}
              >
                <Text style={styles.suggestionText} numberOfLines={2}>
                  {s.displayName}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}
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
  searchLabel: { fontSize: 14, color: brand.textSecondary, marginBottom: 6 },
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
  suggestionsLoading: { marginBottom: 8, minHeight: 24 },
  suggestionsBox: {
    maxHeight: 160,
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    marginBottom: 10,
    backgroundColor: brand.surface,
  },
  suggestionsScroll: { maxHeight: 158 },
  suggestionRow: { paddingHorizontal: 12, paddingVertical: 10, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#e5e7eb' },
  suggestionText: { fontSize: 14, color: brand.textPrimary },
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
