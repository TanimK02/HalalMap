import React from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  Pressable,
  TouchableWithoutFeedback,
  StyleSheet,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { brand } from '../theme';
import { OrderStatusTimeline } from './OrderStatusTimeline';

export type OrderStatusModalProps = {
  visible: boolean;
  onClose: () => void;
  status: string;
};

export function OrderStatusModal({ visible, onClose, status }: OrderStatusModalProps) {
  const insets = useSafeAreaInsets();

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      accessibilityLabel="Order status"
    >
      <Pressable
        style={[styles.modalBackdrop, { paddingTop: insets.top }]}
        onPress={onClose}
        accessibilityLabel="Close order status"
        accessibilityRole="button"
      >
        <TouchableWithoutFeedback>
          <View
            style={[styles.modalPanel, { paddingBottom: insets.bottom + 16 }]}
          >
            <Text style={styles.modalTitle}>Order status</Text>
            <OrderStatusTimeline currentStatus={status} variant="vertical" />
            <TouchableOpacity
              style={styles.modalDoneBtn}
              onPress={onClose}
              accessibilityLabel="Done"
              accessibilityRole="button"
            >
              <Text style={styles.modalDoneBtnText}>Done</Text>
            </TouchableOpacity>
          </View>
        </TouchableWithoutFeedback>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  modalPanel: {
    backgroundColor: brand.background,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: brand.textPrimary,
    marginBottom: 16,
  },
  modalDoneBtn: {
    backgroundColor: brand.primary,
    paddingVertical: 12,
    borderRadius: 8,
    marginTop: 24,
    alignItems: 'center',
  },
  modalDoneBtnText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 16,
  },
});
