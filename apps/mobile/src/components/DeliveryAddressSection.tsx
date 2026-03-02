import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { brand } from '../theme';
import { AddressForm } from './AddressForm';
import type { Address } from '../types/address';

export type DeliveryAddressSectionProps = {
  addresses: Address[];
  deliveryAddressId: string | null;
  onSelectAddress: (id: string) => void;
  onDone: () => void;
  showAddForm: boolean;
  showList: boolean;
  onShowAddForm: (show: boolean) => void;
  onShowList: (show: boolean) => void;
  loading: boolean;
  onSaved: (addr: Address) => void;
  onCancel: () => void;
};

export function DeliveryAddressSection({
  addresses,
  deliveryAddressId,
  onSelectAddress,
  onDone,
  showAddForm,
  showList,
  onShowAddForm,
  onShowList,
  loading,
  onSaved,
  onCancel,
}: DeliveryAddressSectionProps) {
  if (loading) {
    return (
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Delivery address</Text>
        <ActivityIndicator color={brand.primary} />
      </View>
    );
  }
  if (showAddForm) {
    return (
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Delivery address</Text>
        <AddressForm
          onSaved={(addr) => {
            onSaved(addr);
            onShowAddForm(false);
            onShowList(false);
          }}
          onCancel={onCancel}
          submitLabel="Use this address"
        />
      </View>
    );
  }
  if (addresses.length === 0) {
    return (
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Delivery address</Text>
        <TouchableOpacity style={styles.addAddressBtn} onPress={() => onShowAddForm(true)}>
          <Text style={styles.addAddressBtnText}>Add delivery address</Text>
        </TouchableOpacity>
      </View>
    );
  }
  if (showList) {
    return (
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Delivery address</Text>
        {addresses.map((addr) => (
          <TouchableOpacity
            key={addr.id}
            style={[styles.addressRow, deliveryAddressId === addr.id && styles.addressRowActive]}
            onPress={() => {
              onSelectAddress(addr.id);
              onShowList(false);
            }}
          >
            <Text style={styles.addressText}>
              {addr.label ?? addr.street}, {addr.city} {addr.postalCode}
            </Text>
            {addr.isDefault && (
              <Text style={styles.defaultBadge}>Default</Text>
            )}
          </TouchableOpacity>
        ))}
        <TouchableOpacity
          style={styles.addNewAddressBtn}
          onPress={() => onShowAddForm(true)}
        >
          <Text style={styles.addNewAddressBtnText}>+ Add new address</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.doneBtn} onPress={onDone}>
          <Text style={styles.doneBtnText}>Done</Text>
        </TouchableOpacity>
      </View>
    );
  }
  const selected = addresses.find((a) => a.id === deliveryAddressId) ?? addresses[0];
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Delivery address</Text>
      {selected ? (
        <>
          <View style={styles.addressRow}>
            <Text style={styles.addressText}>
              {selected.label ?? selected.street}, {selected.city} {selected.postalCode}
            </Text>
            {selected.isDefault && (
              <Text style={styles.defaultBadge}>Default</Text>
            )}
          </View>
          <TouchableOpacity
            style={styles.changeAddressBtn}
            onPress={() => onShowList(true)}
          >
            <Text style={styles.changeAddressBtnText}>Change address</Text>
          </TouchableOpacity>
        </>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  section: { marginTop: 20 },
  sectionTitle: { fontSize: 16, fontWeight: '600', color: brand.textPrimary, marginBottom: 10 },
  addAddressBtn: {
    padding: 12,
    borderWidth: 1,
    borderColor: brand.primary,
    borderRadius: 8,
    alignItems: 'center',
  },
  addAddressBtnText: { color: brand.primary, fontWeight: '600' },
  addNewAddressBtn: {
    padding: 12,
    borderWidth: 1,
    borderColor: brand.primary,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 8,
  },
  addNewAddressBtnText: { color: brand.primary, fontWeight: '600' },
  doneBtn: {
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#d1d5db',
    alignItems: 'center',
  },
  doneBtnText: { color: brand.textPrimary, fontWeight: '600' },
  changeAddressBtn: {
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#d1d5db',
    alignItems: 'center',
    marginTop: 8,
  },
  changeAddressBtnText: { color: brand.textPrimary, fontWeight: '600' },
  addressRow: {
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#d1d5db',
    marginBottom: 8,
  },
  addressRowActive: { borderColor: brand.primary, backgroundColor: '#f0fdf4' },
  addressText: { fontSize: 14, color: brand.textPrimary },
  defaultBadge: { fontSize: 12, color: brand.primary, marginTop: 4 },
});
