import React from 'react';
import {
  View,
  Text,
  FlatList,
  SectionList,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../context/AuthContext';
import { useFavorites } from '../context/FavoritesContext';
import { useHomeRestaurants } from '../hooks/useHomeRestaurants';
import { HomeFilters } from '../components/HomeFilters';
import { RestaurantCard } from '../components/RestaurantCard';
import { brand } from '../theme';

const RADIUS_MIN = 1;
const RADIUS_MAX = 50;

export default function Home() {
  const navigation = useNavigation();
  const { user } = useAuth();
  const { favoriteRestaurants } = useFavorites();
  const {
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
    onRefresh,
    hasDistanceData,
    sections,
    withinRadius,
  } = useHomeRestaurants();

  const favoritesHeader =
    user && favoriteRestaurants.length > 0 ? (
      <View style={styles.favoritesSection}>
        <Text style={styles.favoritesSectionTitle}>Your favorites</Text>
        <FlatList
          horizontal
          data={favoriteRestaurants}
          keyExtractor={(item) => item.id}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.favoritesList}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.favoriteCard}
              onPress={() =>
                (navigation as { navigate: (s: string, p: object) => void }).navigate(
                  'RestaurantDetail',
                  { restaurantId: item.id, name: item.name }
                )
              }
              activeOpacity={0.7}
            >
              <Text style={styles.favoriteCardTitle} numberOfLines={1}>
                {item.name}
              </Text>
              {item.description ? (
                <Text style={styles.favoriteCardDesc} numberOfLines={2}>
                  {item.description}
                </Text>
              ) : null}
            </TouchableOpacity>
          )}
        />
      </View>
    ) : null;

  const nav = navigation as { navigate: (s: string, p: object) => void };

  return (
    <View style={styles.container}>
      <HomeFilters
        search={search}
        onSearchChange={setSearch}
        halalFilters={halalFilters}
        onToggleHalalFilter={toggleHalalFilter}
        tagCatalog={tagCatalog}
        tagFilters={tagFilters}
        onToggleTagFilter={toggleTagFilter}
        radiusMiles={radiusMiles}
        onRadiusChange={setRadiusMiles}
        distanceExpanded={distanceFilterExpanded}
        onDistanceExpandedChange={setDistanceFilterExpanded}
        sliderValue={sliderValue}
        onSliderValueChange={setSliderValue}
        manualAddress={manualAddress}
        onManualAddressChange={setManualAddress}
        onSubmitManualAddress={submitManualAddress}
        manualSubmitting={manualSubmitting}
        locationResolving={locationResolving}
        hasLocation={!!location}
        hasDistanceData={hasDistanceData}
        radiusMin={RADIUS_MIN}
        radiusMax={RADIUS_MAX}
      />
      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={brand.primary} />
        </View>
      ) : hasDistanceData && sections.length > 0 ? (
        <SectionList
          sections={sections}
          keyExtractor={(item) => item.id}
          ListHeaderComponent={favoritesHeader}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[brand.primary]} />
          }
          contentContainerStyle={styles.list}
          stickySectionHeadersEnabled={false}
          renderSectionHeader={() => null}
          renderItem={({ item }) => (
            <RestaurantCard
              restaurant={item}
              onPress={() => nav.navigate('RestaurantDetail', { restaurantId: item.id, name: item.name })}
            />
          )}
        />
      ) : hasDistanceData && withinRadius.length === 0 ? (
        <ScrollView
          contentContainerStyle={styles.centered}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[brand.primary]} />
          }
        >
          <Text style={styles.empty}>No restaurants within {radiusMiles} mi.</Text>
        </ScrollView>
      ) : (
        <FlatList
          data={restaurants}
          keyExtractor={(item) => item.id}
          ListHeaderComponent={favoritesHeader}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[brand.primary]} />
          }
          contentContainerStyle={styles.list}
          renderItem={({ item }) => (
            <RestaurantCard
              restaurant={item}
              onPress={() => nav.navigate('RestaurantDetail', { restaurantId: item.id, name: item.name })}
            />
          )}
          ListEmptyComponent={
            <View style={styles.centered}>
              <Text style={styles.empty}>No restaurants found.</Text>
            </View>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: brand.background },
  favoritesSection: { marginBottom: 16 },
  favoritesSectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: brand.textPrimary,
    marginBottom: 10,
    paddingHorizontal: 0,
  },
  favoritesList: { gap: 12, paddingBottom: 4 },
  favoriteCard: {
    width: 160,
    backgroundColor: brand.surface,
    borderRadius: 12,
    padding: 12,
    marginRight: 12,
  },
  favoriteCardTitle: { fontSize: 16, fontWeight: '600', color: brand.textPrimary },
  favoriteCardDesc: { fontSize: 13, color: brand.textSecondary, marginTop: 4 },
  list: { padding: 16, paddingBottom: 32 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  empty: { fontSize: 16, color: brand.textSecondary },
});
