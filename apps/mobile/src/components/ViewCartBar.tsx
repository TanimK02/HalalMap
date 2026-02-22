import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useCart } from '../context/CartContext';
import { brand } from '../theme';

type ViewCartBarProps = {
  /** When provided, bar is hidden on Cart tab (for use in tab bar). */
  currentRouteName?: string;
  /** When true, bar is positioned absolute at bottom (e.g. RestaurantDetail). Default true. */
  absolute?: boolean;
};

export function ViewCartBar({ currentRouteName, absolute = true }: ViewCartBarProps) {
  const navigation = useNavigation();
  const { items, total } = useCart();

  if (items.length === 0) return null;
  if (currentRouteName === 'CartTab') return null;

  const goToCart = () =>
    (navigation as { navigate: (a: string, b?: object) => void }).navigate('Main', {
      screen: 'CartTab',
    });

  const barStyle = [
    styles.bar,
    absolute && styles.barAbsolute,
  ];

  return (
    <View style={barStyle}>
      <TouchableOpacity style={styles.button} onPress={goToCart} activeOpacity={0.8}>
        <Text style={styles.label}>
          View Cart ({items.length} {items.length === 1 ? 'item' : 'items'})
        </Text>
        <Text style={styles.total}>${total.toFixed(2)}</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    backgroundColor: brand.surface,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    paddingHorizontal: 16,
    paddingVertical: 12,
    paddingBottom: 24,
  },
  barAbsolute: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: brand.primary,
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 10,
  },
  label: { color: '#fff', fontWeight: '600', fontSize: 16 },
  total: { color: '#fff', fontWeight: '700', fontSize: 16 },
});
