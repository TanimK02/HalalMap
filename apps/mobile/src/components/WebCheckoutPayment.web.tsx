import { useMemo, useState } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  ScrollView,
} from 'react-native';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, PaymentElement, useElements, useStripe } from '@stripe/react-stripe-js';
import type { PendingPayment } from '../hooks/checkoutUtils';
import { brand } from '../theme';

const stripePublishableKey = process.env.EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY ?? '';

type WebCheckoutPaymentProps = {
  pending: PendingPayment | null;
  onSuccess: () => Promise<void>;
  onCancel: () => void;
};

function PaymentForm({
  merchantDisplayName,
  onSuccess,
  onCancel,
}: {
  merchantDisplayName: string;
  onSuccess: () => Promise<void>;
  onCancel: () => void;
}) {
  const stripe = useStripe();
  const elements = useElements();
  const [submitting, setSubmitting] = useState(false);

  async function handlePay() {
    if (!stripe || !elements) return;
    setSubmitting(true);
    try {
      const { error } = await stripe.confirmPayment({
        elements,
        redirect: 'if_required',
      });
      if (error) {
        Alert.alert('Payment failed', error.message ?? 'Payment was not completed.');
        return;
      }
      await onSuccess();
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <ScrollView contentContainerStyle={styles.formContent}>
      <Text style={styles.merchantName}>{merchantDisplayName}</Text>
      <View style={styles.paymentElementWrap}>
        <PaymentElement />
      </View>
      <TouchableOpacity
        style={[styles.payBtn, submitting && styles.payBtnDisabled]}
        onPress={handlePay}
        disabled={submitting || !stripe || !elements}
      >
        {submitting ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.payBtnText}>Pay now</Text>
        )}
      </TouchableOpacity>
      <TouchableOpacity style={styles.cancelBtn} onPress={onCancel} disabled={submitting}>
        <Text style={styles.cancelBtnText}>Cancel</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

export function WebCheckoutPayment({ pending, onSuccess, onCancel }: WebCheckoutPaymentProps) {
  const stripePromise = useMemo(
    () => (stripePublishableKey ? loadStripe(stripePublishableKey) : null),
    []
  );

  if (!pending || !stripePromise) return null;

  return (
    <Modal visible animationType="slide" transparent onRequestClose={onCancel}>
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          <Text style={styles.title}>Complete payment</Text>
          <Elements
            stripe={stripePromise}
            options={{
              clientSecret: pending.clientSecret,
              appearance: { theme: 'stripe', variables: { colorPrimary: brand.primary } },
            }}
          >
            <PaymentForm
              merchantDisplayName={pending.merchantDisplayName}
              onSuccess={onSuccess}
              onCancel={onCancel}
            />
          </Elements>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center',
    padding: 20,
  },
  sheet: {
    backgroundColor: brand.surface,
    borderRadius: 12,
    padding: 20,
    maxHeight: '90%',
    width: '100%',
    maxWidth: 480,
    alignSelf: 'center',
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: brand.textPrimary,
    marginBottom: 16,
  },
  formContent: { paddingBottom: 8 },
  merchantName: {
    fontSize: 16,
    fontWeight: '600',
    color: brand.textSecondary,
    marginBottom: 16,
  },
  paymentElementWrap: { marginBottom: 20, minHeight: 120 },
  payBtn: {
    backgroundColor: brand.accent,
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: 'center',
  },
  payBtnDisabled: { opacity: 0.7 },
  payBtnText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  cancelBtn: { marginTop: 12, paddingVertical: 10, alignItems: 'center' },
  cancelBtnText: { color: brand.textSecondary, fontSize: 15 },
});
