import React, { useState } from 'react';
import {
  View,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Text,
  Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAppTheme } from '../../theme/ThemeProvider';
import { SHADOWS, BORDER_RADIUS, SPACING, TYPOGRAPHY } from '../../theme';

interface EnhancedSearchBarProps {
  value: string;
  onChangeText: (text: string) => void;
  onSearch: () => void;
  placeholder?: string;
  showFilters?: boolean;
  onFiltersPress?: () => void;
}

const EnhancedSearchBar: React.FC<EnhancedSearchBarProps> = ({
  value,
  onChangeText,
  onSearch,
  placeholder = "Search for products...",
  showFilters = false,
  onFiltersPress,
}) => {
  const { theme, isDark } = useAppTheme();
  const [isFocused, setIsFocused] = useState(false);
  const [scaleAnim] = useState(new Animated.Value(1));

  const handleFocus = () => {
    setIsFocused(true);
    Animated.spring(scaleAnim, {
      toValue: 1.02,
      useNativeDriver: true,
    }).start();
  };

  const handleBlur = () => {
    setIsFocused(false);
    Animated.spring(scaleAnim, {
      toValue: 1,
      useNativeDriver: true,
    }).start();
  };

  const styles = StyleSheet.create({
    container: {
      paddingHorizontal: SPACING.lg,
      paddingVertical: SPACING.md,
      backgroundColor: theme.background.primary,
    },
    searchContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: SPACING.sm,
    },
    searchInputContainer: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: theme.background.surface,
      borderRadius: BORDER_RADIUS.xl,
      paddingHorizontal: SPACING.lg,
      paddingVertical: SPACING.md,
      borderWidth: 2,
      borderColor: isFocused ? theme.primary : theme.border,
      ...SHADOWS.clay.light,
    },
    searchIcon: {
      marginRight: SPACING.sm,
    },
    textInput: {
      flex: 1,
      fontSize: TYPOGRAPHY.fontSize.md,
      color: theme.text.primary,
      fontWeight: TYPOGRAPHY.fontWeight.medium,
    },
    clearButton: {
      padding: SPACING.xs,
      marginLeft: SPACING.sm,
    },
    filterButton: {
      backgroundColor: theme.primary,
      borderRadius: BORDER_RADIUS.lg,
      padding: SPACING.md,
      ...SHADOWS.clay.medium,
    },
    filterButtonActive: {
      backgroundColor: theme.primaryDark,
    },
    voiceButton: {
      backgroundColor: theme.iconBackgrounds[6],
      borderRadius: BORDER_RADIUS.lg,
      padding: SPACING.md,
      marginLeft: SPACING.sm,
      ...SHADOWS.clay.light,
    },
    quickActions: {
      flexDirection: 'row',
      marginTop: SPACING.md,
      gap: SPACING.sm,
    },
    quickActionChip: {
      backgroundColor: theme.primaryLight,
      borderRadius: BORDER_RADIUS.pill,
      paddingHorizontal: SPACING.lg,
      paddingVertical: SPACING.sm,
      borderWidth: 1,
      borderColor: theme.primary,
    },
    quickActionText: {
      color: theme.primary,
      fontSize: TYPOGRAPHY.fontSize.sm,
      fontWeight: TYPOGRAPHY.fontWeight.medium,
    },
  });

  const quickActions = ['Trending', 'New Arrivals', 'Sale', 'Categories'];

  return (
    <View style={styles.container}>
      <Animated.View 
        style={[
          styles.searchContainer,
          { transform: [{ scale: scaleAnim }] }
        ]}
      >
        <View style={styles.searchInputContainer}>
          <Ionicons
            name="search"
            size={20}
            color={theme.text.secondary}
            style={styles.searchIcon}
          />
          <TextInput
            style={styles.textInput}
            value={value}
            onChangeText={onChangeText}
            onSubmitEditing={onSearch}
            onFocus={handleFocus}
            onBlur={handleBlur}
            placeholder={placeholder}
            placeholderTextColor={theme.text.tertiary}
            returnKeyType="search"
            autoCapitalize="none"
            autoCorrect={false}
          />
          {value.length > 0 && (
            <TouchableOpacity
              style={styles.clearButton}
              onPress={() => onChangeText('')}
            >
              <Ionicons
                name="close-circle"
                size={20}
                color={theme.text.secondary}
              />
            </TouchableOpacity>
          )}
        </View>

        {/* Voice Search Button */}
        <TouchableOpacity style={styles.voiceButton}>
          <Ionicons
            name="mic"
            size={20}
            color={theme.text.inverse}
          />
        </TouchableOpacity>

        {/* Filter Button */}
        {showFilters && (
          <TouchableOpacity
            style={[styles.filterButton, styles.filterButtonActive]}
            onPress={onFiltersPress}
          >
            <Ionicons
              name="options"
              size={20}
              color={theme.text.inverse}
            />
          </TouchableOpacity>
        )}
      </Animated.View>

      {/* Quick Action Chips */}
      {!isFocused && (
        <View style={styles.quickActions}>
          {quickActions.map((action, index) => (
            <TouchableOpacity
              key={action}
              style={styles.quickActionChip}
              onPress={() => onChangeText(action)}
            >
              <Text style={styles.quickActionText}>{action}</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}
    </View>
  );
};

export default EnhancedSearchBar;
