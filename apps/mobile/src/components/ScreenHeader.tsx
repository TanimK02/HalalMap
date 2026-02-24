import React from 'react';
import { View, Text, Pressable, StyleSheet, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { brand } from '../theme';

type ScreenHeaderProps = {
  title: string;
};

/**
 * In-screen header bar with back button + title. Use when headerShown: false
 * so we have full control over layout and alignment.
 */
export function ScreenHeader({ title }: ScreenHeaderProps) {
  const navigation = useNavigation();

  return (
    <SafeAreaView edges={['top']} style={styles.safe}>
      <View style={styles.bar}>
        <Pressable
          onPress={() => {
            if (navigation.canGoBack()) {
              navigation.goBack();
            }
          }}
          style={({ pressed }) => [styles.backTouchable, pressed && styles.pressed]}
          hitSlop={{ top: 16, bottom: 16, left: 16, right: 16 }}
        >
          <View style={styles.backRow}>
            <Ionicons name="chevron-back" size={24} color={brand.textPrimary} />
            <Text style={styles.backLabel}>Back</Text>
          </View>
        </Pressable>
        <View style={styles.titleWrap}>
          <Text style={styles.title} numberOfLines={1}>
            {title}
          </Text>
        </View>
        <View style={styles.spacer} />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    backgroundColor: brand.surface,
  },
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: Platform.select({ ios: 8, default: 12 }),
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    minHeight: 44,
  },
  backTouchable: {
    paddingVertical: 8,
    paddingRight: 8,
  },
  pressed: {
    opacity: 0.6,
  },
  backRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  backLabel: {
    fontSize: 17,
    color: brand.textPrimary,
    fontWeight: '400',
  },
  titleWrap: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 8,
  },
  title: {
    fontSize: 17,
    fontWeight: '600',
    color: brand.textPrimary,
  },
  spacer: {
    width: 80,
  },
});
