import React from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { brand } from '../theme';

const PROGRESSION = ['PENDING', 'ACCEPTED', 'PREPARING', 'READY', 'COMPLETED'] as const;

const STATUS_LABELS: Record<string, string> = {
  PENDING: 'Pending',
  ACCEPTED: 'Accepted',
  PREPARING: 'Preparing',
  READY: 'Ready',
  COMPLETED: 'Completed',
  CANCELLED: 'Cancelled',
};

type OrderStatusTimelineProps = {
  currentStatus: string;
  statuses?: readonly string[];
  variant?: 'horizontal' | 'vertical';
};

export function OrderStatusTimeline({
  currentStatus,
  statuses = PROGRESSION,
  variant = 'horizontal',
}: OrderStatusTimelineProps) {
  const isCancelled = currentStatus === 'CANCELLED';
  const steps = [...statuses];
  const currentIndex = PROGRESSION.indexOf(currentStatus as (typeof PROGRESSION)[number]);
  const displaySteps = isCancelled ? [...steps, 'CANCELLED' as const] : steps;

  if (variant === 'vertical') {
    return (
      <View style={styles.verticalContainer} accessibilityLabel="Order status timeline">
        {displaySteps.map((status, index) => {
          const label = STATUS_LABELS[status] ?? status;
          const stepIndex = PROGRESSION.indexOf(status as (typeof PROGRESSION)[number]);
          const isCancelledStep = status === 'CANCELLED';
          const isCompleted =
            !isCancelled && !isCancelledStep && stepIndex >= 0 && stepIndex < currentIndex;
          const isCurrent = !isCancelled && !isCancelledStep && status === currentStatus;

          let iconName: keyof typeof Ionicons.glyphMap = 'ellipse-outline';
          let iconColor = brand.textSecondary;
          let labelStyle = styles.labelUpcoming;

          if (isCancelledStep) {
            iconName = 'close-circle';
            iconColor = brand.textSecondary;
            labelStyle = styles.labelCancelled;
          } else if (isCompleted) {
            iconName = 'checkmark-circle';
            iconColor = brand.primary;
            labelStyle = styles.labelCompleted;
          } else if (isCurrent) {
            iconName = 'ellipse';
            iconColor = brand.primary;
            labelStyle = styles.labelCurrent;
          } else {
            iconName = 'ellipse-outline';
            iconColor = brand.textSecondary;
            labelStyle = styles.labelUpcoming;
          }

          return (
            <React.Fragment key={isCancelledStep ? 'CANCELLED' : status}>
              <View
                style={styles.verticalStepRow}
                accessibilityRole="text"
                accessibilityLabel={`${label}${isCurrent ? ', current step' : ''}${isCompleted ? ', completed' : ''}`}
              >
                <View style={styles.verticalDotColumn}>
                  <Ionicons name={iconName} size={22} color={iconColor} />
                </View>
                <Text style={[styles.labelVertical, labelStyle]} numberOfLines={1}>
                  {isCancelledStep ? 'Cancelled' : label}
                </Text>
              </View>
              {index < displaySteps.length - 1 && (
                <View style={styles.connectorRow}>
                  <View
                    style={[
                      styles.connectorVertical,
                      isCompleted && styles.connectorDone,
                    ]}
                  />
                </View>
              )}
            </React.Fragment>
          );
        })}
      </View>
    );
  }

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.scrollContent}
      accessibilityLabel="Order status timeline"
    >
      {displaySteps.map((status, index) => {
        const label = STATUS_LABELS[status] ?? status;
        const stepIndex = PROGRESSION.indexOf(status as (typeof PROGRESSION)[number]);
        const isCancelledStep = status === 'CANCELLED';
        const isCompleted =
          !isCancelled && !isCancelledStep && stepIndex >= 0 && stepIndex < currentIndex;
        const isCurrent = !isCancelled && !isCancelledStep && status === currentStatus;

        let iconName: keyof typeof Ionicons.glyphMap = 'ellipse-outline';
        let iconColor = brand.textSecondary;
        let labelStyle = styles.labelUpcoming;

        if (isCancelledStep) {
          iconName = 'close-circle';
          iconColor = brand.textSecondary;
          labelStyle = styles.labelCancelled;
        } else if (isCompleted) {
          iconName = 'checkmark-circle';
          iconColor = brand.primary;
          labelStyle = styles.labelCompleted;
        } else if (isCurrent) {
          iconName = 'ellipse';
          iconColor = brand.primary;
          labelStyle = styles.labelCurrent;
        } else {
          iconName = 'ellipse-outline';
          iconColor = brand.textSecondary;
          labelStyle = styles.labelUpcoming;
        }

        return (
          <View
            key={isCancelledStep ? 'CANCELLED' : status}
            style={styles.step}
            accessibilityRole="text"
            accessibilityLabel={`${label}${isCurrent ? ', current step' : ''}${isCompleted ? ', completed' : ''}`}
          >
            <View style={styles.nodeRow}>
              <Ionicons name={iconName} size={22} color={iconColor} />
              {index < displaySteps.length - 1 && (
                <View
                  style={[styles.connector, isCompleted && styles.connectorDone]}
                />
              )}
            </View>
            <Text style={[styles.label, labelStyle]} numberOfLines={1}>
              {isCancelledStep ? 'Cancelled' : label}
            </Text>
          </View>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  verticalContainer: {
    paddingVertical: 8,
  },
  verticalStepRow: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 28,
  },
  verticalDotColumn: {
    width: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  connectorRow: {
    flexDirection: 'row',
    paddingLeft: 0,
  },
  connectorVertical: {
    width: 2,
    height: 20,
    backgroundColor: '#E5E7EB',
    marginLeft: 13,
  },
  labelVertical: {
    fontSize: 16,
    flex: 1,
  },
  scrollContent: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 12,
    paddingRight: 24,
  },
  step: {
    alignItems: 'flex-start',
    width: 72,
  },
  nodeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'stretch',
  },
  connector: {
    flex: 1,
    height: 2,
    backgroundColor: '#E5E7EB',
  },
  connectorDone: {
    backgroundColor: brand.primary,
  },
  label: {
    fontSize: 12,
    marginTop: 4,
    maxWidth: 80,
    textAlign: 'center',
    alignSelf: 'center',
  },
  labelCompleted: {
    color: brand.primary,
    fontWeight: '500',
  },
  labelCurrent: {
    color: brand.primary,
    fontWeight: '700',
  },
  labelUpcoming: {
    color: brand.textSecondary,
  },
  labelCancelled: {
    color: brand.textSecondary,
    fontWeight: '600',
  },
});
