import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { brand } from '../theme';
import type { MenuItem } from '../types/restaurant';

const THUMB_SIZE = 72;

export type MenuItemRowProps = {
  item: MenuItem;
  categoryName: string;
  canAdd: boolean;
  onAdd: () => void;
};

export function MenuItemRow({ item, categoryName, canAdd, onAdd }: MenuItemRowProps) {
  const [imageError, setImageError] = useState(false);
  const showImage = item.imageUrl && !imageError;

  return (
    <View style={styles.itemRow}>
      <View style={styles.itemThumbWrap}>
        {showImage ? (
          <Image
            source={{ uri: item.imageUrl! }}
            style={styles.itemThumb}
            resizeMode="cover"
            onError={() => setImageError(true)}
            accessibilityLabel={`Photo of ${item.name}`}
          />
        ) : (
          <View
            style={styles.itemThumbPlaceholder}
            accessibilityLabel={`No photo for ${item.name}`}
          >
            <Ionicons
              name="restaurant-outline"
              size={THUMB_SIZE * 0.4}
              color={brand.textSecondary}
            />
            <Text style={styles.itemThumbPlaceholderText} numberOfLines={1}>
              No image
            </Text>
          </View>
        )}
      </View>
      <View style={styles.itemInfo}>
        <Text style={styles.itemName}>{item.name}</Text>
        {item.description ? (
          <Text style={styles.itemDesc} numberOfLines={2}>
            {item.description}
          </Text>
        ) : null}
        {item.availableForPickup && item.availableForDelivery === false ? (
          <Text style={styles.availabilityNote}>Pickup only</Text>
        ) : item.availableForDelivery && item.availableForPickup === false ? (
          <Text style={styles.availabilityNote}>Delivery only</Text>
        ) : null}
        <Text style={styles.itemPrice}>${Number(item.price).toFixed(2)}</Text>
      </View>
      <TouchableOpacity
        style={[styles.addBtn, (!item.isAvailable || !canAdd) && styles.addBtnDisabled]}
        onPress={onAdd}
        disabled={!item.isAvailable || !canAdd}
      >
        <Text style={styles.addBtnText}>
          {!item.isAvailable ? 'Unavailable' : canAdd ? 'Add' : 'Not available'}
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: brand.surface,
    borderRadius: 10,
    padding: 12,
    marginBottom: 8,
    gap: 12,
  },
  itemThumbWrap: {
    width: THUMB_SIZE,
    height: THUMB_SIZE,
    borderRadius: 8,
    overflow: 'hidden',
  },
  itemThumb: {
    width: THUMB_SIZE,
    height: THUMB_SIZE,
  },
  itemThumbPlaceholder: {
    width: THUMB_SIZE,
    height: THUMB_SIZE,
    backgroundColor: '#E5E7EB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemThumbPlaceholderText: {
    fontSize: 10,
    color: brand.textSecondary,
    marginTop: 2,
  },
  itemInfo: { flex: 1, minWidth: 0 },
  itemName: { fontSize: 16, fontWeight: '600', color: brand.textPrimary },
  itemDesc: { fontSize: 13, color: brand.textSecondary, marginTop: 4 },
  availabilityNote: {
    fontSize: 12,
    color: brand.textSecondary,
    marginTop: 2,
    fontStyle: 'italic',
  },
  itemPrice: { fontSize: 15, fontWeight: '600', color: brand.primary, marginTop: 4 },
  addBtn: {
    backgroundColor: brand.accent,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
  },
  addBtnDisabled: { backgroundColor: '#d1d5db', opacity: 0.7 },
  addBtnText: { color: '#fff', fontWeight: '600', fontSize: 14 },
});
