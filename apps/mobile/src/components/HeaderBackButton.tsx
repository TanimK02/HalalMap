import React from 'react';
import { Pressable, StyleSheet, View, Platform, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { brand } from '../theme';

const TAP_HEIGHT = Platform.select({ ios: 44, default: 48 });
const MARGIN_LEFT = Platform.select({ ios: 8, default: 16 });

/**
 * Back button with chevron + "Back" label for stack headers. Balances the
 * icon with text and keeps working after payment flows / tab switches.
 */
export function HeaderBackButton() {
  const navigation = useNavigation();

  return (
    <Pressable
      onPress={() => {
        if (navigation.canGoBack()) {
          navigation.goBack();
        }
      }}
      style={({ pressed }) => [styles.touchable, pressed && styles.pressed]}
      hitSlop={{ top: 20, bottom: 20, left: 20, right: 20 }}
    >
      <View style={styles.row}>
        <View style={styles.iconWrap}>
          <Ionicons name="chevron-back" size={24} color={brand.textPrimary} />
        </View>
        <Text style={styles.label}>Back</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  touchable: {
    marginLeft: MARGIN_LEFT,
    height: TAP_HEIGHT,
    justifyContent: 'center',
    alignItems: 'flex-start',
  },
  pressed: {
    opacity: 0.6,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconWrap: {
    width: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  label: {
    fontSize: 17,
    color: brand.textPrimary,
    fontWeight: '400',
  },
});
