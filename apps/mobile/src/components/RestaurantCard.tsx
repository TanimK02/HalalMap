import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { brand, halalBadgeStyles, HALAL_LABELS, hoursStatusColors } from '../theme';
import { getHoursLabel, getHoursStatus } from '../utils/businessHours';
import { useConfig } from '../context/ConfigContext';
import type { Restaurant } from '../types/restaurant';

export type RestaurantCardProps = {
  restaurant: Restaurant;
  onPress: () => void;
};

export function RestaurantCard({ restaurant, onPress }: RestaurantCardProps) {
  const { enableDelivery } = useConfig();
  const badgeStyle = (status: string) => halalBadgeStyles[status] ?? { bg: '#E5E7EB', text: '#1F2933' };

  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.7}>
      <View style={styles.cardHeader}>
        <Text style={styles.cardTitle}>{restaurant.name}</Text>
        <View style={styles.badgeRow}>
          {(restaurant.halalStatuses ?? []).map((status) => {
            const style = badgeStyle(status);
            return (
              <View key={status} style={[styles.badge, { backgroundColor: style.bg }]}>
                <Text style={[styles.badgeText, { color: style.text }]}>
                  {HALAL_LABELS[status] ?? status}
                </Text>
              </View>
            );
          })}
          {(restaurant.tags ?? []).map((tag) => (
            <View key={tag.id} style={[styles.badge, styles.tagBadge]}>
              <Text style={[styles.badgeText, styles.tagBadgeText]}>{tag.label}</Text>
            </View>
          ))}
        </View>
      </View>
      {restaurant.description ? (
        <Text style={styles.cardDesc} numberOfLines={2}>
          {restaurant.description}
        </Text>
      ) : null}
      {(() => {
        const hours = getHoursLabel(restaurant.businessHours);
        if (!hours.primary) return null;
        const status = getHoursStatus(restaurant.businessHours).status;
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
        {restaurant.address}
      </Text>
      <View style={styles.cardMeta}>
        {restaurant.distanceMiles != null && (
          <Text style={styles.meta}>{Number(restaurant.distanceMiles).toFixed(1)} mi away</Text>
        )}
        {restaurant.offersPickup && <Text style={styles.meta}>Pickup</Text>}
        {enableDelivery && restaurant.offersDelivery && <Text style={styles.meta}>Delivery</Text>}
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
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
  tagBadge: { backgroundColor: '#E0E7FF' },
  tagBadgeText: { color: '#3730A3' },
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
});
