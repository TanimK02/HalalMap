import React from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { brand, HALAL_LABELS } from '../theme';
import { RadiusSlider } from './RadiusSlider';
import type { RestaurantTag } from '../types/restaurant';

export type HomeFiltersProps = {
  search: string;
  onSearchChange: (v: string) => void;
  halalFilters: string[];
  onToggleHalalFilter: (value: string) => void;
  tagCatalog: RestaurantTag[];
  tagFilters: string[];
  onToggleTagFilter: (tagId: string) => void;
  radiusMiles: number;
  onRadiusChange: (v: number) => void;
  distanceExpanded: boolean;
  onDistanceExpandedChange: (v: boolean) => void;
  sliderValue: number;
  onSliderValueChange: (v: number) => void;
  manualAddress: string;
  onManualAddressChange: (v: string) => void;
  onSubmitManualAddress: () => void;
  manualSubmitting: boolean;
  locationResolving: boolean;
  hasLocation: boolean;
  hasDistanceData: boolean;
  radiusMin?: number;
  radiusMax?: number;
};

export function HomeFilters({
  search,
  onSearchChange,
  halalFilters,
  onToggleHalalFilter,
  tagCatalog,
  tagFilters,
  onToggleTagFilter,
  radiusMiles,
  onRadiusChange,
  distanceExpanded,
  onDistanceExpandedChange,
  sliderValue,
  onSliderValueChange,
  manualAddress,
  onManualAddressChange,
  onSubmitManualAddress,
  manualSubmitting,
  locationResolving,
  hasLocation,
  hasDistanceData,
  radiusMin = 1,
  radiusMax = 50,
}: HomeFiltersProps) {
  return (
    <View style={styles.filters}>
      <TextInput
        style={styles.search}
        placeholder="Search restaurants..."
        placeholderTextColor={brand.textSecondary}
        value={search}
        onChangeText={onSearchChange}
      />
      {!hasLocation && !locationResolving && (
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
              onChangeText={onManualAddressChange}
            />
            <TouchableOpacity
              style={[styles.manualButton, manualSubmitting && styles.manualButtonDisabled]}
              onPress={onSubmitManualAddress}
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
              onPress={() => onToggleHalalFilter(item.value)}
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
      {tagCatalog.length > 0 ? (
        <View style={styles.tagSection}>
          <Text style={styles.tagSectionLabel}>Tags</Text>
          <FlatList
            horizontal
            data={tagCatalog}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => {
              const isActive = tagFilters.includes(item.id);
              return (
                <TouchableOpacity
                  style={[styles.filterChip, isActive && styles.filterChipActive]}
                  onPress={() => onToggleTagFilter(item.id)}
                >
                  <Text
                    style={[styles.filterChipText, isActive && styles.filterChipTextActive]}
                  >
                    {item.label}
                  </Text>
                </TouchableOpacity>
              );
            }}
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.filterList}
          />
        </View>
      ) : null}
      {hasDistanceData && (
        <>
          <TouchableOpacity
            style={[
              styles.distanceButton,
              distanceExpanded && styles.distanceButtonActive,
            ]}
            onPress={() => onDistanceExpandedChange(!distanceExpanded)}
            activeOpacity={0.7}
          >
            <Ionicons
              name="car-outline"
              size={18}
              color={distanceExpanded ? '#fff' : brand.textPrimary}
              style={styles.distanceButtonIcon}
            />
            <Text
              style={[
                styles.distanceButtonText,
                distanceExpanded && styles.distanceButtonTextActive,
              ]}
            >
              {radiusMiles} mi
            </Text>
          </TouchableOpacity>
          {distanceExpanded && (
            <View style={styles.radiusRow}>
              <Text style={styles.radiusLabel}>Within: {sliderValue} mi</Text>
              <RadiusSlider
                value={sliderValue}
                min={radiusMin}
                max={radiusMax}
                step={1}
                onValueChange={onSliderValueChange}
                onSlidingComplete={onRadiusChange}
              />
            </View>
          )}
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
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
  tagSection: { marginTop: 10 },
  tagSectionLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: brand.textSecondary,
    marginBottom: 6,
  },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#E5E7EB',
    marginRight: 8,
  },
  filterChipActive: { backgroundColor: brand.primary },
  filterChipText: { fontSize: 14, color: brand.textPrimary },
  filterChipTextActive: { color: '#fff', fontWeight: '600' },
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
  radiusRow: { marginTop: 10 },
  radiusLabel: { fontSize: 13, color: brand.textSecondary, marginBottom: 4 },
});
