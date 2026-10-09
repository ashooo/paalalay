import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, useColorScheme } from 'react-native';
import { linawTheme } from '../theme.tokens';

interface EmptyStateCardProps {
  icon?: string;
  title: string;
  description: string;
  actionLabel?: string;
  onActionPress?: () => void;
}

export const EmptyStateCard: React.FC<EmptyStateCardProps> = ({
  icon = '📊',
  title,
  description,
  actionLabel,
  onActionPress,
}) => {
  const isDark = useColorScheme() === 'dark';
  const colors = isDark ? linawTheme.colors.dark : linawTheme.colors.light;

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: colors.surface,
          borderColor: colors.border,
        },
      ]}
    >
      <View style={[styles.iconBadge, { backgroundColor: colors.surfaceVariant }]}>
        <Text style={styles.iconText}>{icon}</Text>
      </View>
      <Text style={[styles.title, { color: colors.text }]}>{title}</Text>
      <Text style={[styles.description, { color: colors.textMuted }]}>{description}</Text>

      {actionLabel && onActionPress ? (
        <TouchableOpacity
          onPress={onActionPress}
          activeOpacity={0.8}
          style={[styles.actionButton, { backgroundColor: colors.primary }]}
        >
          <Text style={[styles.actionButtonText, { color: colors.onPrimary }]}>
            {actionLabel}
          </Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    padding: 20,
    borderRadius: linawTheme.radius.md,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 8,
  },
  iconBadge: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  iconText: {
    fontSize: 22,
  },
  title: {
    fontSize: linawTheme.typography.scale.subtitle.fontSize,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 6,
  },
  description: {
    fontSize: linawTheme.typography.scale.caption.fontSize,
    textAlign: 'center',
    lineHeight: 20,
    maxWidth: 280,
  },
  actionButton: {
    marginTop: 14,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: linawTheme.radius.sm,
  },
  actionButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
});
