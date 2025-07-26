import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useAppTheme } from '../../theme/ThemeProvider';
import { SHADOWS, BORDER_RADIUS, SPACING, TYPOGRAPHY } from '../../theme';

interface SectionHeaderProps {
  title: string;
  subtitle?: string;
  onSeeAllPress?: () => void;
  showSeeAll?: boolean;
  icon?: keyof typeof Ionicons.glyphMap;
  categoryIndex?: number;
}

const SectionHeader: React.FC<SectionHeaderProps> = ({
  title,
  subtitle,
  onSeeAllPress,
  showSeeAll = true,
  icon,
  categoryIndex = 0,
}) => {
  const { theme } = useAppTheme();

  // Get vibrant background color based on category index
  const getIconBackground = () => {
    return theme.iconBackgrounds[categoryIndex % theme.iconBackgrounds.length];
  };

  const styles = StyleSheet.create({
    container: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: SPACING.lg,
      paddingVertical: SPACING.md,
      marginBottom: SPACING.sm,
    },
    leftContent: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
    },
    iconContainer: {
      width: 40,
      height: 40,
      borderRadius: BORDER_RADIUS.lg,
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: SPACING.md,
      ...SHADOWS.clay.light,
    },
    textContainer: {
      flex: 1,
    },
    title: {
      fontSize: TYPOGRAPHY.fontSize.lg,
      fontWeight: TYPOGRAPHY.fontWeight.bold,
      color: theme.text.primary,
      lineHeight: TYPOGRAPHY.lineHeight.tight * TYPOGRAPHY.fontSize.lg,
    },
    subtitle: {
      fontSize: TYPOGRAPHY.fontSize.sm,
      color: theme.text.secondary,
      fontWeight: TYPOGRAPHY.fontWeight.medium,
      marginTop: 2,
    },
    seeAllButton: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: theme.background.surface,
      paddingHorizontal: SPACING.md,
      paddingVertical: SPACING.sm,
      borderRadius: BORDER_RADIUS.pill,
      borderWidth: 1,
      borderColor: theme.border,
      ...SHADOWS.clay.light,
    },
    seeAllText: {
      fontSize: TYPOGRAPHY.fontSize.sm,
      color: theme.primary,
      fontWeight: TYPOGRAPHY.fontWeight.semibold,
      marginRight: SPACING.xs,
    },
    decorativeLine: {
      position: 'absolute',
      bottom: 0,
      left: SPACING.lg,
      right: SPACING.lg,
      height: 2,
      borderRadius: 1,
    },
  });

  return (
    <View style={styles.container}>
      <View style={styles.leftContent}>
        {/* Category Icon */}
        <LinearGradient
          colors={[getIconBackground(), `${getIconBackground()}CC`]}
          style={styles.iconContainer}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <Ionicons
            name={icon || 'apps'}
            size={20}
            color={theme.text.inverse}
          />
        </LinearGradient>

        {/* Title and Subtitle */}
        <View style={styles.textContainer}>
          <Text style={styles.title}>{title}</Text>
          {subtitle && (
            <Text style={styles.subtitle}>{subtitle}</Text>
          )}
        </View>
      </View>

      {/* See All Button */}
      {showSeeAll && onSeeAllPress && (
        <TouchableOpacity
          style={styles.seeAllButton}
          onPress={onSeeAllPress}
        >
          <Text style={styles.seeAllText}>See All</Text>
          <Ionicons
            name="chevron-forward"
            size={16}
            color={theme.primary}
          />
        </TouchableOpacity>
      )}

      {/* Decorative Line */}
      <LinearGradient
        colors={[
          'transparent',
          getIconBackground(),
          'transparent',
        ]}
        style={styles.decorativeLine}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
      />
    </View>
  );
};

export default SectionHeader;
